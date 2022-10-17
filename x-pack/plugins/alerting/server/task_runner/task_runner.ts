/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import { cloneDeep, omit } from 'lodash';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import uuid from 'uuid';
import { KibanaRequest, Logger } from '@kbn/core/server';
import { ConcreteTaskInstance, throwUnrecoverableError } from '@kbn/task-manager-plugin/server';
import { nanosToMillis } from '@kbn/event-log-plugin/server';
import { TaskRunnerContext } from './task_runner_factory';
import { createExecutionHandler } from './create_execution_handler';
import { Alert, createAlertFactory } from '../alert';
import {
  ElasticsearchError,
  ErrorWithReason,
  executionStatusFromError,
  executionStatusFromState,
  ruleExecutionStatusToRaw,
  isRuleSnoozed,
  processAlerts,
} from '../lib';
import {
  Rule,
  RuleExecutionStatus,
  RuleExecutionStatusErrorReasons,
  IntervalSchedule,
  RawAlertInstance,
  RawRule,
  RawRuleExecutionStatus,
  RuleMonitoring,
  RuleMonitoringHistory,
  RuleTaskState,
  RuleTypeRegistry,
} from '../types';
import { asErr, asOk, map, resolveErr, Result } from '../lib/result_type';
import { getExecutionDurationPercentiles, getExecutionSuccessRatio } from '../lib/monitoring';
import { taskInstanceToAlertTaskInstance } from './alert_task_instance';
import { isAlertSavedObjectNotFoundError, isEsUnavailableError } from '../lib/is_alerting_error';
import { partiallyUpdateAlert } from '../saved_objects';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleTypeParams,
  RuleTypeState,
  parseDuration,
  WithoutReservedActionGroups,
} from '../../common';
import { NormalizedRuleType, UntypedNormalizedRuleType } from '../rule_type_registry';
import { getEsErrorMessage } from '../lib/errors';
import { InMemoryMetrics, IN_MEMORY_METRICS } from '../monitoring';
import {
  RuleTaskInstance,
  RuleTaskRunResult,
  RuleTaskStateAndMetrics,
  RunRuleParams,
} from './types';
import { createWrappedScopedClusterClientFactory } from '../lib/wrap_scoped_cluster_client';
import { IExecutionStatusAndMetrics } from '../lib/rule_execution_status';
import { RuleRunMetricsStore } from '../lib/rule_run_metrics_store';
import { wrapSearchSourceClient } from '../lib/wrap_search_source_client';
import { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';
import { loadRule } from './rule_loader';
import { logAlerts } from './log_alerts';
import { scheduleActionsForAlerts } from './schedule_actions_for_alerts';
import { getPublicAlertFactory } from '../alert/create_alert_factory';
import { TaskRunnerTimer, TaskRunnerTimerSpan } from './task_runner_timer';

const FALLBACK_RETRY_INTERVAL = '5m';
const CONNECTIVITY_RETRY_INTERVAL = '5m';

export const getDefaultRuleMonitoring = (): RuleMonitoring => ({
  execution: {
    history: [],
    calculated_metrics: {
      success_ratio: 0,
    },
  },
});

interface StackTraceLog {
  message: ElasticsearchError;
  stackTrace?: string;
}

export class TaskRunner<
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams,
  RuleState extends RuleTypeState,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  private context: TaskRunnerContext;
  private logger: Logger;
  private taskInstance: RuleTaskInstance;
  private ruleConsumer: string | null;
  private ruleType: NormalizedRuleType<
    Params,
    ExtractedParams,
    RuleState,
    State,
    Context,
    ActionGroupIds,
    RecoveryActionGroupId
  >;
  private readonly executionId: string;
  private readonly ruleTypeRegistry: RuleTypeRegistry;
  private readonly inMemoryMetrics: InMemoryMetrics;
  private readonly maxAlerts: number;
  private alerts: Record<string, Alert<State, Context>>;
  private timer: TaskRunnerTimer;
  private alertingEventLogger: AlertingEventLogger;
  private usageCounter?: UsageCounter;
  private searchAbortController: AbortController;
  private cancelled: boolean;
  private stackTraceLog: StackTraceLog | null;

  constructor(
    ruleType: NormalizedRuleType<
      Params,
      ExtractedParams,
      RuleState,
      State,
      Context,
      ActionGroupIds,
      RecoveryActionGroupId
    >,
    taskInstance: ConcreteTaskInstance,
    context: TaskRunnerContext,
    inMemoryMetrics: InMemoryMetrics
  ) {
    this.context = context;
    const loggerId = ruleType.id.startsWith('.') ? ruleType.id.substring(1) : ruleType.id;
    this.logger = context.logger.get(loggerId);
    this.usageCounter = context.usageCounter;
    this.ruleType = ruleType;
    this.ruleConsumer = null;
    this.taskInstance = taskInstanceToAlertTaskInstance(taskInstance);
    this.ruleTypeRegistry = context.ruleTypeRegistry;
    this.searchAbortController = new AbortController();
    this.cancelled = false;
    this.executionId = uuid.v4();
    this.inMemoryMetrics = inMemoryMetrics;
    this.maxAlerts = context.maxAlerts;
    this.alerts = {};
    this.timer = new TaskRunnerTimer({ logger: this.logger });
    this.alertingEventLogger = new AlertingEventLogger(this.context.eventLogger);
    this.stackTraceLog = null;
  }

  private getExecutionHandler(
    ruleId: string,
    ruleName: string,
    tags: string[] | undefined,
    spaceId: string,
    apiKey: RawRule['apiKey'],
    kibanaBaseUrl: string | undefined,
    actions: Rule<Params>['actions'],
    ruleParams: Params,
    request: KibanaRequest
  ) {
    return createExecutionHandler<
      Params,
      ExtractedParams,
      RuleState,
      State,
      Context,
      ActionGroupIds,
      RecoveryActionGroupId
    >({
      ruleId,
      ruleName,
      ruleConsumer: this.ruleConsumer!,
      tags,
      executionId: this.executionId,
      logger: this.logger,
      actionsPlugin: this.context.actionsPlugin,
      apiKey,
      actions,
      spaceId,
      ruleType: this.ruleType,
      kibanaBaseUrl,
      alertingEventLogger: this.alertingEventLogger,
      request,
      ruleParams,
      supportsEphemeralTasks: this.context.supportsEphemeralTasks,
      maxEphemeralActionsPerRule: this.context.maxEphemeralActionsPerRule,
      actionsConfigMap: this.context.actionsConfigMap,
    });
  }

  private async updateRuleSavedObject(
    ruleId: string,
    namespace: string | undefined,
    attributes: { executionStatus?: RawRuleExecutionStatus; monitoring?: RuleMonitoring }
  ) {
    const client = this.context.internalSavedObjectsRepository;

    try {
      await partiallyUpdateAlert(client, ruleId, attributes, {
        ignore404: true,
        namespace,
        refresh: false,
      });
    } catch (err) {
      this.logger.error(`error updating rule for ${this.ruleType.id}:${ruleId} ${err.message}`);
    }
  }

  private shouldLogAndScheduleActionsForAlerts() {
    // if execution hasn't been cancelled, return true
    if (!this.cancelled) {
      return true;
    }

    // if execution has been cancelled, return true if EITHER alerting config or rule type indicate to proceed with scheduling actions
    return !this.context.cancelAlertsOnRuleTimeout || !this.ruleType.cancelAlertsOnRuleTimeout;
  }

  private countUsageOfActionExecutionAfterRuleCancellation() {
    if (this.cancelled && this.usageCounter) {
      if (this.context.cancelAlertsOnRuleTimeout && this.ruleType.cancelAlertsOnRuleTimeout) {
        // Increment usage counter for skipped actions
        this.usageCounter.incrementCounter({
          counterName: `alertsSkippedDueToRuleExecutionTimeout_${this.ruleType.id}`,
          incrementBy: 1,
        });
      }
    }
  }

  private async runRule({
    fakeRequest,
    rulesClient,
    rule,
    apiKey,
    validatedParams: params,
  }: RunRuleParams<Params>): Promise<RuleTaskStateAndMetrics> {
    if (apm.currentTransaction) {
      apm.currentTransaction.name = `Execute Alerting Rule: "${rule.name}"`;
      apm.currentTransaction.addLabels({
        alerting_rule_consumer: rule.consumer,
        alerting_rule_name: rule.name,
        alerting_rule_tags: rule.tags.join(', '),
        alerting_rule_type_id: rule.alertTypeId,
        alerting_rule_params: JSON.stringify(rule.params),
      });
    }

    const {
      alertTypeId: ruleTypeId,
      consumer,
      schedule,
      throttle,
      notifyWhen,
      mutedInstanceIds,
      name,
      tags,
      createdBy,
      updatedBy,
      createdAt,
      updatedAt,
      enabled,
      actions,
    } = rule;
    const {
      params: { alertId: ruleId, spaceId },
      state: {
        alertInstances: alertRawInstances = {},
        alertTypeState: ruleTypeState = {},
        previousStartedAt,
      },
    } = this.taskInstance;

    const ruleRunMetricsStore = new RuleRunMetricsStore();

    const namespace = this.context.spaceIdToNamespace(spaceId);
    const ruleType = this.ruleTypeRegistry.get(ruleTypeId);

    const ruleLabel = `${this.ruleType.id}:${ruleId}: '${name}'`;

    const wrappedClientOptions = {
      rule: {
        name: rule.name,
        alertTypeId: rule.alertTypeId,
        id: rule.id,
        spaceId,
      },
      logger: this.logger,
      abortController: this.searchAbortController,
    };
    const scopedClusterClient = this.context.elasticsearch.client.asScoped(fakeRequest);
    const wrappedScopedClusterClient = createWrappedScopedClusterClientFactory({
      ...wrappedClientOptions,
      scopedClusterClient,
    });
    const searchSourceClient = await this.context.data.search.searchSource.asScoped(fakeRequest);
    const wrappedSearchSourceClient = wrapSearchSourceClient({
      ...wrappedClientOptions,
      searchSourceClient,
    });

    const { updatedRuleTypeState, hasReachedAlertLimit, originalAlerts } =
      await this.timer.runWithTimer(TaskRunnerTimerSpan.RuleTypeRun, async () => {
        for (const id in alertRawInstances) {
          if (alertRawInstances.hasOwnProperty(id)) {
            this.alerts[id] = new Alert<State, Context>(id, alertRawInstances[id]);
          }
        }

        const alertsCopy = cloneDeep(this.alerts);

        const alertFactory = createAlertFactory<
          State,
          Context,
          WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupId>
        >({
          alerts: this.alerts,
          logger: this.logger,
          maxAlerts: this.maxAlerts,
          canSetRecoveryContext: ruleType.doesSetRecoveryContext ?? false,
        });

        const checkHasReachedAlertLimit = () => {
          const reachedLimit = alertFactory.hasReachedAlertLimit();
          if (reachedLimit) {
            this.logger.warn(
              `rule execution generated greater than ${this.maxAlerts} alerts: ${ruleLabel}`
            );
            ruleRunMetricsStore.setHasReachedAlertLimit(true);
          }
          return reachedLimit;
        };

        let updatedState: void | Record<string, unknown>;
        try {
          const ctx = {
            type: 'alert',
            name: `execute ${rule.alertTypeId}`,
            id: ruleId,
            description: `execute [${rule.alertTypeId}] with name [${name}] in [${
              namespace ?? 'default'
            }] namespace`,
          };

          const savedObjectsClient = this.context.savedObjects.getScopedClient(fakeRequest, {
            includedHiddenTypes: ['alert', 'action'],
          });

          updatedState = await this.context.executionContext.withContext(ctx, () =>
            this.ruleType.executor({
              alertId: ruleId,
              executionId: this.executionId,
              services: {
                savedObjectsClient,
                searchSourceClient: wrappedSearchSourceClient.searchSourceClient,
                uiSettingsClient: this.context.uiSettings.asScopedToClient(savedObjectsClient),
                scopedClusterClient: wrappedScopedClusterClient.client(),
                alertFactory: getPublicAlertFactory(alertFactory),
                shouldWriteAlerts: () => this.shouldLogAndScheduleActionsForAlerts(),
                shouldStopExecution: () => this.cancelled,
              },
              params,
              state: ruleTypeState as RuleState,
              startedAt: this.taskInstance.startedAt!,
              previousStartedAt: previousStartedAt ? new Date(previousStartedAt) : null,
              spaceId,
              namespace,
              name,
              tags,
              createdBy,
              updatedBy,
              rule: {
                name,
                tags,
                consumer,
                producer: ruleType.producer,
                ruleTypeId: rule.alertTypeId,
                ruleTypeName: ruleType.name,
                enabled,
                schedule,
                actions,
                createdBy,
                updatedBy,
                createdAt,
                updatedAt,
                throttle,
                notifyWhen,
              },
              logger: this.logger,
            })
          );

          // Rule type execution has successfully completed
          // Check that the rule type either never requested the max alerts limit
          // or requested it and then reported back whether it exceeded the limit
          // If neither of these apply, this check will throw an error
          // These errors should show up during rule type development
          alertFactory.alertLimit.checkLimitUsage();
        } catch (err) {
          // Check if this error is due to reaching the alert limit
          if (!checkHasReachedAlertLimit()) {
            this.alertingEventLogger.setExecutionFailed(
              `rule execution failure: ${ruleLabel}`,
              err.message
            );
            this.stackTraceLog = {
              message: err,
              stackTrace: err.stack,
            };
            throw new ErrorWithReason(RuleExecutionStatusErrorReasons.Execute, err);
          }
        }

        // Check if the rule type has reported that it reached the alert limit
        checkHasReachedAlertLimit();

        this.alertingEventLogger.setExecutionSucceeded(`rule executed: ${ruleLabel}`);
        ruleRunMetricsStore.setSearchMetrics([
          wrappedScopedClusterClient.getMetrics(),
          wrappedSearchSourceClient.getMetrics(),
        ]);

        return {
          originalAlerts: alertsCopy,
          updatedRuleTypeState: updatedState || undefined,
          hasReachedAlertLimit: alertFactory.hasReachedAlertLimit(),
        };
      });

    const { activeAlerts, recoveredAlerts } = await this.timer.runWithTimer(
      TaskRunnerTimerSpan.ProcessAlerts,
      async () => {
        const {
          newAlerts: processedAlertsNew,
          activeAlerts: processedAlertsActive,
          recoveredAlerts: processedAlertsRecovered,
        } = processAlerts<State, Context, ActionGroupIds, RecoveryActionGroupId>({
          alerts: this.alerts,
          existingAlerts: originalAlerts,
          hasReachedAlertLimit,
          alertLimit: this.maxAlerts,
        });

        logAlerts({
          logger: this.logger,
          alertingEventLogger: this.alertingEventLogger,
          newAlerts: processedAlertsNew,
          activeAlerts: processedAlertsActive,
          recoveredAlerts: processedAlertsRecovered,
          ruleLogPrefix: ruleLabel,
          ruleRunMetricsStore,
          canSetRecoveryContext: ruleType.doesSetRecoveryContext ?? false,
          shouldPersistAlerts: this.shouldLogAndScheduleActionsForAlerts(),
        });

        return {
          newAlerts: processedAlertsNew,
          activeAlerts: processedAlertsActive,
          recoveredAlerts: processedAlertsRecovered,
        };
      }
    );

    await this.timer.runWithTimer(TaskRunnerTimerSpan.TriggerActions, async () => {
      const executionHandler = this.getExecutionHandler(
        ruleId,
        rule.name,
        rule.tags,
        spaceId,
        apiKey,
        this.context.kibanaBaseUrl,
        rule.actions,
        rule.params,
        fakeRequest
      );

      await rulesClient.clearExpiredSnoozes({ id: rule.id });

      const ruleIsSnoozed = isRuleSnoozed(rule);
      if (!ruleIsSnoozed && this.shouldLogAndScheduleActionsForAlerts()) {
        const mutedAlertIdsSet = new Set(mutedInstanceIds);

        await scheduleActionsForAlerts<State, Context, ActionGroupIds, RecoveryActionGroupId>({
          activeAlerts,
          recoveryActionGroup: this.ruleType.recoveryActionGroup,
          recoveredAlerts,
          executionHandler,
          mutedAlertIdsSet,
          logger: this.logger,
          ruleLabel,
          ruleRunMetricsStore,
          throttle,
          notifyWhen,
        });
      } else {
        if (ruleIsSnoozed) {
          this.logger.debug(`no scheduling of actions for rule ${ruleLabel}: rule is snoozed.`);
        }
        if (!this.shouldLogAndScheduleActionsForAlerts()) {
          this.logger.debug(
            `no scheduling of actions for rule ${ruleLabel}: rule execution has been cancelled.`
          );
          // Usage counter for telemetry
          // This keeps track of how many times action executions were skipped after rule
          // execution completed successfully after the execution timeout
          // This can occur when rule executors do not short circuit execution in response
          // to timeout
          this.countUsageOfActionExecutionAfterRuleCancellation();
        }
      }
    });

    const alertsToReturn: Record<string, RawAlertInstance> = {};
    for (const id in activeAlerts) {
      if (activeAlerts.hasOwnProperty(id)) {
        alertsToReturn[id] = activeAlerts[id].toRaw();
      }
    }

    return {
      metrics: ruleRunMetricsStore.getMetrics(),
      alertTypeState: updatedRuleTypeState || undefined,
      alertInstances: alertsToReturn,
    };
  }

  /**
   * Initialize event logger, load and validate the rule
   */
  private async prepareToRun() {
    const {
      params: { alertId: ruleId, spaceId, consumer },
    } = this.taskInstance;

    if (apm.currentTransaction) {
      apm.currentTransaction.name = `Execute Alerting Rule`;
      apm.currentTransaction.addLabels({
        alerting_rule_id: ruleId,
      });
    }

    // Initially use consumer as stored inside the task instance
    // Replace this with consumer as read from the rule saved object after
    // we successfully read the rule SO. This allows us to populate a consumer
    // value for `execute-start` events (which are written before the rule SO is read)
    // and in the event of decryption errors (where we cannot read the rule SO)
    // Because "consumer" is set when a rule is created, this value should be static
    // for the life of a rule but there may be edge cases where migrations cause
    // the consumer values to become out of sync.
    if (consumer) {
      this.ruleConsumer = consumer;
    }

    const namespace = this.context.spaceIdToNamespace(spaceId);

    this.alertingEventLogger.initialize({
      ruleId,
      ruleType: this.ruleType as UntypedNormalizedRuleType,
      consumer: this.ruleConsumer!,
      spaceId,
      executionId: this.executionId,
      taskScheduledAt: this.taskInstance.scheduledAt,
      ...(namespace ? { namespace } : {}),
    });

    this.alertingEventLogger.start();

    return await loadRule<Params>({
      paramValidator: this.ruleType.validate?.params,
      ruleId,
      spaceId,
      context: this.context,
      ruleTypeRegistry: this.ruleTypeRegistry,
      alertingEventLogger: this.alertingEventLogger,
    });
  }

  private async processRunResults({
    runDate,
    stateWithMetrics,
    monitoring,
  }: {
    runDate: Date;
    stateWithMetrics: Result<RuleTaskStateAndMetrics, Error>;
    monitoring: RuleMonitoring;
  }) {
    const {
      params: { alertId: ruleId, spaceId },
    } = this.taskInstance;

    const namespace = this.context.spaceIdToNamespace(spaceId);

    const { status: executionStatus, metrics: executionMetrics } = map<
      RuleTaskStateAndMetrics,
      ElasticsearchError,
      IExecutionStatusAndMetrics
    >(
      stateWithMetrics,
      (ruleRunStateWithMetrics) => executionStatusFromState(ruleRunStateWithMetrics, runDate),
      (err: ElasticsearchError) => executionStatusFromError(err, runDate)
    );

    if (apm.currentTransaction) {
      if (executionStatus.status === 'ok' || executionStatus.status === 'active') {
        apm.currentTransaction.setOutcome('success');
      } else if (executionStatus.status === 'error' || executionStatus.status === 'unknown') {
        apm.currentTransaction.setOutcome('failure');
      }
    }

    this.logger.debug(
      `ruleRunStatus for ${this.ruleType.id}:${ruleId}: ${JSON.stringify(executionStatus)}`
    );
    if (executionMetrics) {
      this.logger.debug(
        `ruleRunMetrics for ${this.ruleType.id}:${ruleId}: ${JSON.stringify(executionMetrics)}`
      );
    }

    const monitoringHistory: RuleMonitoringHistory = {
      success: true,
      timestamp: +new Date(),
    };

    // set start and duration based on event log
    const { start, duration } = this.alertingEventLogger.getStartAndDuration();
    if (null != start) {
      executionStatus.lastExecutionDate = start;
    }
    if (null != duration) {
      executionStatus.lastDuration = nanosToMillis(duration);
      monitoringHistory.duration = executionStatus.lastDuration;
    }

    // if executionStatus indicates an error, fill in fields in
    // event from it
    if (executionStatus.error) {
      monitoringHistory.success = false;
    }

    monitoring.execution.history.push(monitoringHistory);
    monitoring.execution.calculated_metrics = {
      success_ratio: getExecutionSuccessRatio(monitoring),
      ...getExecutionDurationPercentiles(monitoring),
    };

    if (!this.cancelled) {
      this.inMemoryMetrics.increment(IN_MEMORY_METRICS.RULE_EXECUTIONS);
      if (executionStatus.error) {
        this.inMemoryMetrics.increment(IN_MEMORY_METRICS.RULE_FAILURES);
      }
      this.logger.debug(
        `Updating rule task for ${this.ruleType.id} rule with id ${ruleId} - ${JSON.stringify(
          executionStatus
        )}`
      );
      await this.updateRuleSavedObject(ruleId, namespace, {
        executionStatus: ruleExecutionStatusToRaw(executionStatus),
        monitoring,
      });
    }

    return { executionStatus, executionMetrics };
  }

  async run(): Promise<RuleTaskRunResult> {
    const {
      params: { alertId: ruleId, spaceId },
      startedAt,
      state: originalState,
      schedule: taskSchedule,
    } = this.taskInstance;

    const runDate = new Date();
    this.logger.debug(`executing rule ${this.ruleType.id}:${ruleId} at ${runDate.toISOString()}`);

    if (startedAt) {
      // Capture how long it took for the rule to start running after being claimed
      this.timer.setDuration(TaskRunnerTimerSpan.StartTaskRun, startedAt);
    }

    let stateWithMetrics: Result<RuleTaskStateAndMetrics, Error>;
    let monitoring: RuleMonitoring = getDefaultRuleMonitoring();
    let schedule: Result<IntervalSchedule, Error>;
    try {
      const preparedResult = await this.timer.runWithTimer(
        TaskRunnerTimerSpan.PrepareRule,
        async () => this.prepareToRun()
      );

      monitoring = preparedResult.rule.monitoring ?? getDefaultRuleMonitoring();

      stateWithMetrics = asOk(await this.runRule(preparedResult));

      // fetch the rule again to ensure we return the correct schedule as it may have
      // changed during the task execution
      schedule = asOk((await preparedResult.rulesClient.get({ id: ruleId })).schedule);
    } catch (err) {
      stateWithMetrics = asErr(err);
      schedule = asErr(err);
    }

    const { executionStatus, executionMetrics } = await this.timer.runWithTimer(
      TaskRunnerTimerSpan.ProcessRuleRun,
      async () =>
        this.processRunResults({
          runDate,
          stateWithMetrics,
          monitoring,
        })
    );

    const transformRunStateToTaskState = (
      runStateWithMetrics: RuleTaskStateAndMetrics
    ): RuleTaskState => {
      return {
        ...omit(runStateWithMetrics, ['metrics']),
        previousStartedAt: startedAt,
      };
    };

    if (startedAt) {
      // Capture how long it took for the rule to run after being claimed
      this.timer.setDuration(TaskRunnerTimerSpan.TotalRunDuration, startedAt);
    }

    this.alertingEventLogger.done({
      status: executionStatus,
      metrics: executionMetrics,
      timings: this.timer.toJson(),
    });

    return {
      state: map<RuleTaskStateAndMetrics, ElasticsearchError, RuleTaskState>(
        stateWithMetrics,
        (ruleRunStateWithMetrics: RuleTaskStateAndMetrics) =>
          transformRunStateToTaskState(ruleRunStateWithMetrics),
        (err: ElasticsearchError) => {
          if (isAlertSavedObjectNotFoundError(err, ruleId)) {
            const message = `Executing Rule ${spaceId}:${
              this.ruleType.id
            }:${ruleId} has resulted in Error: ${getEsErrorMessage(err)}`;
            this.logger.debug(message);
          } else {
            const error = this.stackTraceLog ? this.stackTraceLog.message : err;
            const stack = this.stackTraceLog ? this.stackTraceLog.stackTrace : err.stack;
            const message = `Executing Rule ${spaceId}:${
              this.ruleType.id
            }:${ruleId} has resulted in Error: ${getEsErrorMessage(error)} - ${stack ?? ''}`;
            this.logger.error(message, {
              tags: [this.ruleType.id, ruleId, 'rule-run-failed'],
              error: { stack_trace: stack },
            });
          }
          return originalState;
        }
      ),
      schedule: resolveErr<IntervalSchedule | undefined, Error>(schedule, (error) => {
        if (isAlertSavedObjectNotFoundError(error, ruleId)) {
          const spaceMessage = spaceId ? `in the "${spaceId}" space ` : '';
          this.logger.warn(
            `Unable to execute rule "${ruleId}" ${spaceMessage}because ${error.message} - this rule will not be rescheduled. To restart rule execution, try disabling and re-enabling this rule.`
          );
          throwUnrecoverableError(error);
        }

        let retryInterval = taskSchedule?.interval ?? FALLBACK_RETRY_INTERVAL;

        // Set retry interval smaller for ES connectivity errors
        if (isEsUnavailableError(error, ruleId)) {
          retryInterval =
            parseDuration(retryInterval) > parseDuration(CONNECTIVITY_RETRY_INTERVAL)
              ? CONNECTIVITY_RETRY_INTERVAL
              : retryInterval;
        }

        return { interval: retryInterval };
      }),
      monitoring,
    };
  }

  async cancel(): Promise<void> {
    if (this.cancelled) {
      return;
    }

    this.cancelled = true;

    // Write event log entry
    const {
      params: { alertId: ruleId, spaceId, consumer },
    } = this.taskInstance;
    const namespace = this.context.spaceIdToNamespace(spaceId);

    if (consumer && !this.ruleConsumer) {
      this.ruleConsumer = consumer;
    }

    this.logger.debug(
      `Cancelling rule type ${this.ruleType.id} with id ${ruleId} - execution exceeded rule type timeout of ${this.ruleType.ruleTaskTimeout}`
    );

    this.logger.debug(
      `Aborting any in-progress ES searches for rule type ${this.ruleType.id} with id ${ruleId}`
    );
    this.searchAbortController.abort();

    this.alertingEventLogger.logTimeout();

    this.inMemoryMetrics.increment(IN_MEMORY_METRICS.RULE_TIMEOUTS);

    // Update the rule saved object with execution status
    const executionStatus: RuleExecutionStatus = {
      lastExecutionDate: new Date(),
      status: 'error',
      error: {
        reason: RuleExecutionStatusErrorReasons.Timeout,
        message: `${this.ruleType.id}:${ruleId}: execution cancelled due to timeout - exceeded rule type timeout of ${this.ruleType.ruleTaskTimeout}`,
      },
    };
    this.logger.debug(
      `Updating rule task for ${this.ruleType.id} rule with id ${ruleId} - execution error due to timeout`
    );
    await this.updateRuleSavedObject(ruleId, namespace, {
      executionStatus: ruleExecutionStatusToRaw(executionStatus),
    });
  }
}
