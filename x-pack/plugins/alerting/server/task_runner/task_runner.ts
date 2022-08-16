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
import { createExecutionHandler, ExecutionHandler } from './create_execution_handler';
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
  SanitizedRule,
  RulesClientApi,
} from '../types';
import { asErr, asOk, map, promiseResult, resolveErr, Resultable } from '../lib/result_type';
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
  ScheduleActionsForRecoveredAlertsParams,
  RuleRunResult,
  RuleTaskStateAndMetrics,
} from './types';
import { createWrappedScopedClusterClientFactory } from '../lib/wrap_scoped_cluster_client';
import { IExecutionStatusAndMetrics } from '../lib/rule_execution_status';
import { RuleRunMetricsStore } from '../lib/rule_run_metrics_store';
import { wrapSearchSourceClient } from '../lib/wrap_search_source_client';
import { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';
import { SearchMetrics } from '../lib/types';
import { loadRule } from './rule_loader';
import { logAlerts } from './log_alerts';

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
  private alertingEventLogger: AlertingEventLogger;
  private usageCounter?: UsageCounter;
  private searchAbortController: AbortController;
  private cancelled: boolean;

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
    this.logger = context.logger;
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
    this.alertingEventLogger = new AlertingEventLogger(this.context.eventLogger);
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

  private async executeAlert(
    alertId: string,
    alert: Alert<State, Context, ActionGroupIds | RecoveryActionGroupId>,
    executionHandler: ExecutionHandler<ActionGroupIds | RecoveryActionGroupId>,
    ruleRunMetricsStore: RuleRunMetricsStore
  ) {
    if (alert.hasScheduledActions()) {
      const {
        actionGroup,
        subgroup: actionSubgroup,
        context,
        state,
      } = alert.getScheduledActionOptions()!;
      alert.updateLastScheduledActions(actionGroup, actionSubgroup);
      alert.unscheduleActions();
      return executionHandler({
        actionGroup,
        actionSubgroup,
        context,
        state,
        alertId,
        ruleRunMetricsStore,
      });
    }

    return Promise.resolve();
  }

  private async executeRule(
    fakeRequest: KibanaRequest,
    rulesClient: RulesClientApi,
    rule: SanitizedRule<Params>,
    apiKey: RawRule['apiKey'],
    params: Params,
    spaceId: string
  ): Promise<RuleTaskStateAndMetrics> {
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
      params: { alertId: ruleId },
      state: {
        alertInstances: alertRawInstances = {},
        alertTypeState: ruleTypeState = {},
        previousStartedAt,
      },
    } = this.taskInstance;

    const ruleRunMetricsStore = new RuleRunMetricsStore();

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

    const namespace = this.context.spaceIdToNamespace(spaceId);
    const ruleType = this.ruleTypeRegistry.get(ruleTypeId);

    const alerts: Record<string, Alert<State, Context>> = {};
    for (const id in alertRawInstances) {
      if (alertRawInstances.hasOwnProperty(id)) {
        alerts[id] = new Alert<State, Context>(id, alertRawInstances[id]);
      }
    }
    const originalAlerts = cloneDeep(alerts);

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

    const alertFactory = createAlertFactory<
      State,
      Context,
      WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupId>
    >({
      alerts,
      logger: this.logger,
      maxAlerts: this.maxAlerts,
      canSetRecoveryContext: ruleType.doesSetRecoveryContext ?? false,
    });
    let updatedRuleTypeState: void | Record<string, unknown>;
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

      updatedRuleTypeState = await this.context.executionContext.withContext(ctx, () =>
        this.ruleType.executor({
          alertId: ruleId,
          executionId: this.executionId,
          services: {
            savedObjectsClient,
            searchSourceClient: wrappedSearchSourceClient.searchSourceClient,
            uiSettingsClient: this.context.uiSettings.asScopedToClient(savedObjectsClient),
            scopedClusterClient: wrappedScopedClusterClient.client(),
            alertFactory,
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
        })
      );
    } catch (err) {
      // Check if this error is due to reaching the alert limit
      if (alertFactory.hasReachedAlertLimit()) {
        this.logger.warn(
          `rule execution generated greater than ${this.maxAlerts} alerts: ${ruleLabel}`
        );
        ruleRunMetricsStore.setHasReachedAlertLimit(true);
      } else {
        this.alertingEventLogger.setExecutionFailed(
          `rule execution failure: ${ruleLabel}`,
          err.message
        );
        this.logger.error(err, {
          tags: [this.ruleType.id, ruleId, 'rule-run-failed'],
          error: { stack_trace: err.stack },
        });
        throw new ErrorWithReason(RuleExecutionStatusErrorReasons.Execute, err);
      }
    }

    this.alertingEventLogger.setExecutionSucceeded(`rule executed: ${ruleLabel}`);

    const scopedClusterClientMetrics = wrappedScopedClusterClient.getMetrics();
    const searchSourceClientMetrics = wrappedSearchSourceClient.getMetrics();
    const searchMetrics: SearchMetrics = {
      numSearches: scopedClusterClientMetrics.numSearches + searchSourceClientMetrics.numSearches,
      totalSearchDurationMs:
        scopedClusterClientMetrics.totalSearchDurationMs +
        searchSourceClientMetrics.totalSearchDurationMs,
      esSearchDurationMs:
        scopedClusterClientMetrics.esSearchDurationMs +
        searchSourceClientMetrics.esSearchDurationMs,
    };

    ruleRunMetricsStore.setNumSearches(searchMetrics.numSearches);
    ruleRunMetricsStore.setTotalSearchDurationMs(searchMetrics.totalSearchDurationMs);
    ruleRunMetricsStore.setEsSearchDurationMs(searchMetrics.esSearchDurationMs);

    const { newAlerts, activeAlerts, recoveredAlerts } = processAlerts<
      State,
      Context,
      ActionGroupIds,
      RecoveryActionGroupId
    >({
      alerts,
      existingAlerts: originalAlerts,
      hasReachedAlertLimit: alertFactory.hasReachedAlertLimit(),
      alertLimit: this.maxAlerts,
    });

    logAlerts({
      logger: this.logger,
      alertingEventLogger: this.alertingEventLogger,
      newAlerts,
      activeAlerts,
      recoveredAlerts,
      ruleLogPrefix: ruleLabel,
      ruleRunMetricsStore,
      canSetRecoveryContext: ruleType.doesSetRecoveryContext ?? false,
      shouldPersistAlerts: this.shouldLogAndScheduleActionsForAlerts(),
    });

    await rulesClient.clearExpiredSnoozes({ id: rule.id });

    const ruleIsSnoozed = isRuleSnoozed(rule);
    if (!ruleIsSnoozed && this.shouldLogAndScheduleActionsForAlerts()) {
      const mutedAlertIdsSet = new Set(mutedInstanceIds);

      const alertsWithExecutableActions = Object.entries(activeAlerts).filter(
        ([alertName, alert]: [string, Alert<State, Context, ActionGroupIds>]) => {
          const throttled = alert.isThrottled(throttle);
          const muted = mutedAlertIdsSet.has(alertName);
          let shouldExecuteAction = true;

          if (throttled || muted) {
            shouldExecuteAction = false;
            this.logger.debug(
              `skipping scheduling of actions for '${alertName}' in rule ${ruleLabel}: rule is ${
                muted ? 'muted' : 'throttled'
              }`
            );
          } else if (
            notifyWhen === 'onActionGroupChange' &&
            !alert.scheduledActionGroupOrSubgroupHasChanged()
          ) {
            shouldExecuteAction = false;
            this.logger.debug(
              `skipping scheduling of actions for '${alertName}' in rule ${ruleLabel}: alert is active but action group has not changed`
            );
          }

          return shouldExecuteAction;
        }
      );

      await Promise.all(
        alertsWithExecutableActions.map(
          ([alertId, alert]: [string, Alert<State, Context, ActionGroupIds>]) =>
            this.executeAlert(alertId, alert, executionHandler, ruleRunMetricsStore)
        )
      );

      await scheduleActionsForRecoveredAlerts<State, Context, RecoveryActionGroupId>({
        recoveryActionGroup: this.ruleType.recoveryActionGroup,
        recoveredAlerts,
        executionHandler,
        mutedAlertIdsSet,
        logger: this.logger,
        ruleLabel,
        ruleRunMetricsStore,
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

  private async loadRuleAttributesAndRun(): Promise<Resultable<RuleRunResult, Error>> {
    const {
      params: { alertId: ruleId, spaceId },
    } = this.taskInstance;

    const { rule, fakeRequest, apiKey, rulesClient, validatedParams } = await loadRule<Params>({
      paramValidator: this.ruleType.validate?.params,
      ruleId,
      spaceId,
      context: this.context,
      ruleTypeRegistry: this.ruleTypeRegistry,
      alertingEventLogger: this.alertingEventLogger,
    });

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

    return {
      rulesClient: asOk(rulesClient),
      monitoring: asOk(rule.monitoring),
      stateWithMetrics: await promiseResult<RuleTaskStateAndMetrics, Error>(
        this.executeRule(fakeRequest, rulesClient, rule, apiKey, validatedParams, spaceId)
      ),
      schedule: asOk(
        // fetch the rule again to ensure we return the correct schedule as it may have
        // changed during the task execution
        (await rulesClient.get({ id: ruleId })).schedule
      ),
    };
  }

  async run(): Promise<RuleTaskRunResult> {
    const {
      params: { alertId: ruleId, spaceId, consumer },
      startedAt,
      state: originalState,
      schedule: taskSchedule,
    } = this.taskInstance;

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

    if (apm.currentTransaction) {
      apm.currentTransaction.name = `Execute Alerting Rule`;
      apm.currentTransaction.addLabels({
        alerting_rule_id: ruleId,
      });
    }

    const runDate = new Date();
    const runDateString = runDate.toISOString();
    this.logger.debug(`executing rule ${this.ruleType.id}:${ruleId} at ${runDateString}`);

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

    const { stateWithMetrics, schedule, monitoring } = await errorAsRuleTaskRunResult(
      this.loadRuleAttributesAndRun()
    );

    const ruleMonitoring =
      resolveErr<RuleMonitoring | undefined, Error>(monitoring, () => {
        return getDefaultRuleMonitoring();
      }) ?? getDefaultRuleMonitoring();

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

    this.alertingEventLogger.done({ status: executionStatus, metrics: executionMetrics });

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

    ruleMonitoring.execution.history.push(monitoringHistory);
    ruleMonitoring.execution.calculated_metrics = {
      success_ratio: getExecutionSuccessRatio(ruleMonitoring),
      ...getExecutionDurationPercentiles(ruleMonitoring),
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
        monitoring: ruleMonitoring,
      });
    }

    const transformRunStateToTaskState = (
      runStateWithMetrics: RuleTaskStateAndMetrics
    ): RuleTaskState => {
      return {
        ...omit(runStateWithMetrics, ['metrics']),
        previousStartedAt: startedAt,
      };
    };

    return {
      state: map<RuleTaskStateAndMetrics, ElasticsearchError, RuleTaskState>(
        stateWithMetrics,
        (ruleRunStateWithMetrics: RuleTaskStateAndMetrics) =>
          transformRunStateToTaskState(ruleRunStateWithMetrics),
        (err: ElasticsearchError) => {
          const message = `Executing Rule ${spaceId}:${
            this.ruleType.id
          }:${ruleId} has resulted in Error: ${getEsErrorMessage(err)}`;
          if (isAlertSavedObjectNotFoundError(err, ruleId)) {
            this.logger.debug(message);
          } else {
            this.logger.error(message, {
              tags: [this.ruleType.id, ruleId, 'rule-run-failed'],
              error: { stack_trace: err.stack },
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
      monitoring: ruleMonitoring,
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

async function scheduleActionsForRecoveredAlerts<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  RecoveryActionGroupId extends string
>(
  params: ScheduleActionsForRecoveredAlertsParams<
    InstanceState,
    InstanceContext,
    RecoveryActionGroupId
  >
): Promise<void> {
  const {
    logger,
    recoveryActionGroup,
    recoveredAlerts,
    executionHandler,
    mutedAlertIdsSet,
    ruleLabel,
    ruleRunMetricsStore,
  } = params;
  const recoveredIds = Object.keys(recoveredAlerts);

  for (const id of recoveredIds) {
    if (mutedAlertIdsSet.has(id)) {
      logger.debug(
        `skipping scheduling of actions for '${id}' in rule ${ruleLabel}: instance is muted`
      );
    } else {
      const alert = recoveredAlerts[id];
      alert.updateLastScheduledActions(recoveryActionGroup.id);
      alert.unscheduleActions();
      await executionHandler({
        actionGroup: recoveryActionGroup.id,
        context: alert.getContext(),
        state: {},
        alertId: id,
        ruleRunMetricsStore,
      });
      alert.scheduleActions(recoveryActionGroup.id);
    }
  }
}

/**
 * If an error is thrown, wrap it in an RuleTaskRunResult
 * so that we can treat each field independantly
 */
async function errorAsRuleTaskRunResult(
  future: Promise<Resultable<RuleRunResult, Error>>
): Promise<Resultable<RuleRunResult, Error>> {
  try {
    return await future;
  } catch (e) {
    return {
      rulesClient: asErr(e),
      stateWithMetrics: asErr(e),
      schedule: asErr(e),
      monitoring: asErr(e),
    };
  }
}
