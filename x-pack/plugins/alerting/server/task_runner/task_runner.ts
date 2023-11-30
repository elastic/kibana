/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import { omit } from 'lodash';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { v4 as uuidv4 } from 'uuid';
import { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import {
  ConcreteTaskInstance,
  throwUnrecoverableError,
  createTaskRunError,
  TaskErrorSource,
} from '@kbn/task-manager-plugin/server';
import { nanosToMillis } from '@kbn/event-log-plugin/server';
import { ExecutionHandler, RunResult } from './execution_handler';
import {
  ElasticsearchError,
  ErrorWithReason,
  executionStatusFromError,
  executionStatusFromState,
  ruleExecutionStatusToRaw,
  isRuleSnoozed,
  lastRunFromError,
  getNextRun,
} from '../lib';
import {
  RuleExecutionStatus,
  RuleExecutionStatusErrorReasons,
  IntervalSchedule,
  RawRuleExecutionStatus,
  RawRuleMonitoring,
  RuleTaskState,
  RuleTypeRegistry,
  RawRuleLastRun,
  RawRuleExecutionGap,
} from '../types';
import { asErr, asOk, isErr, isOk, map, resolveErr, Result } from '../lib/result_type';
import { taskInstanceToAlertTaskInstance } from './alert_task_instance';
import { isAlertSavedObjectNotFoundError, isEsUnavailableError } from '../lib/is_alerting_error';
import { partiallyUpdateAlert } from '../saved_objects';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleTypeParams,
  RuleTypeState,
  parseDuration,
  RawAlertInstance,
  RuleLastRunOutcomeOrderMap,
  RuleAlertData,
} from '../../common';
import { NormalizedRuleType, UntypedNormalizedRuleType } from '../rule_type_registry';
import { getEsErrorMessage } from '../lib/errors';
import { InMemoryMetrics, IN_MEMORY_METRICS } from '../monitoring';
import {
  RuleTaskInstance,
  RuleTaskRunResult,
  RuleTaskStateAndMetrics,
  RunRuleParams,
  TaskRunnerContext,
} from './types';
import { IExecutionStatusAndMetrics } from '../lib/rule_execution_status';
import { RuleRunMetricsStore } from '../lib/rule_run_metrics_store';
import { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';
import {
  getRuleAttributes,
  RuleData,
  RuleDataResult,
  ValidatedRuleData,
  validateRule,
} from './rule_loader';
import { TaskRunnerTimer, TaskRunnerTimerSpan } from './task_runner_timer';
import { RuleMonitoringService } from '../monitoring/rule_monitoring_service';
import { ILastRun, lastRunFromState, lastRunToRaw } from '../lib/last_run_status';
import { RunningHandler } from './running_handler';
import { RuleResultService } from '../monitoring/rule_result_service';
import { MaintenanceWindow } from '../application/maintenance_window/types';
import { getExecutorServices } from './get_executor_services';
import { RuleRunner } from './rule_runner';

const FALLBACK_RETRY_INTERVAL = '5m';
const CONNECTIVITY_RETRY_INTERVAL = '5m';

interface StackTraceLog {
  message: ElasticsearchError;
  stackTrace?: string;
}

interface TaskRunnerConstructorParams<
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams,
  RuleState extends RuleTypeState,
  AlertState extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string,
  AlertData extends RuleAlertData
> {
  ruleType: NormalizedRuleType<
    Params,
    ExtractedParams,
    RuleState,
    AlertState,
    Context,
    ActionGroupIds,
    RecoveryActionGroupId,
    AlertData
  >;
  taskInstance: ConcreteTaskInstance;
  context: TaskRunnerContext;
  internalSavedObjectsRepository: ISavedObjectsRepository;
  inMemoryMetrics: InMemoryMetrics;
}

export class TaskRunner<
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams,
  RuleState extends RuleTypeState,
  AlertState extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string,
  AlertData extends RuleAlertData
> {
  private context: TaskRunnerContext;
  private logger: Logger;
  private taskInstance: RuleTaskInstance;
  private ruleConsumer: string | null;
  private ruleType: NormalizedRuleType<
    Params,
    ExtractedParams,
    RuleState,
    AlertState,
    Context,
    ActionGroupIds,
    RecoveryActionGroupId,
    AlertData
  >;
  private readonly executionId: string;
  private readonly ruleTypeRegistry: RuleTypeRegistry;
  private readonly inMemoryMetrics: InMemoryMetrics;
  private readonly internalSavedObjectsRepository: ISavedObjectsRepository;
  private timer: TaskRunnerTimer;
  private alertingEventLogger: AlertingEventLogger;
  private usageCounter?: UsageCounter;
  private searchAbortController: AbortController;
  private cancelled: boolean;
  private stackTraceLog: StackTraceLog | null;
  private ruleMonitoringAndGaps: RuleMonitoringService;
  private ruleRunning: RunningHandler;
  private ruleResult: RuleResultService;
  private ruleRunner: RuleRunner<
    AlertData,
    AlertState,
    Context,
    ActionGroupIds,
    RecoveryActionGroupId
  >;
  private ruleData?: RuleDataResult<RuleData<Params>>;
  private runDate = new Date();

  constructor({
    ruleType,
    taskInstance,
    context,
    inMemoryMetrics,
    internalSavedObjectsRepository,
  }: TaskRunnerConstructorParams<
    Params,
    ExtractedParams,
    RuleState,
    AlertState,
    Context,
    ActionGroupIds,
    RecoveryActionGroupId,
    AlertData
  >) {
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
    this.executionId = uuidv4();
    this.inMemoryMetrics = inMemoryMetrics;
    this.internalSavedObjectsRepository = internalSavedObjectsRepository;
    this.timer = new TaskRunnerTimer({ logger: this.logger });
    this.alertingEventLogger = new AlertingEventLogger(this.context.eventLogger);
    this.stackTraceLog = null;
    this.ruleMonitoringAndGaps = new RuleMonitoringService();
    this.ruleRunner = new RuleRunner<
      AlertData,
      AlertState,
      Context,
      ActionGroupIds,
      RecoveryActionGroupId
    >({
      context: this.context,
      logger: this.logger,
      timer: this.timer,
      runCancelled: () => this.cancelled,
    });
    this.ruleRunning = new RunningHandler(
      this.internalSavedObjectsRepository,
      this.logger,
      loggerId
    );
    this.ruleResult = new RuleResultService();
  }

  private async updateRuleSavedObjectPostRun(
    ruleId: string,
    namespace: string | undefined,
    attributes: {
      executionStatus?: RawRuleExecutionStatus;
      monitoring?: RawRuleMonitoring;
      nextRun?: string | null;
      lastRun?: RawRuleLastRun | null;
      executionGaps?: RawRuleExecutionGap[];
    }
  ) {
    const client = this.internalSavedObjectsRepository;
    try {
      // Future engineer -> Here we are just checking if we need to wait for
      // the update of the attribute `running` in the rule's saved object
      // and we are swallowing the error because we still want to move forward
      // with the update of our rule since we are putting back the running attribute
      // back to false
      await this.ruleRunning.waitFor();
      // eslint-disable-next-line no-empty
    } catch {}
    try {
      await partiallyUpdateAlert(
        client,
        ruleId,
        { ...attributes, running: false },
        {
          ignore404: true,
          namespace,
          refresh: false,
        }
      );
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

  // Usage counter for telemetry
  // This keeps track of how many times action executions were skipped after rule
  // execution completed successfully after the execution timeout
  // This can occur when rule executors do not short circuit execution in response
  // to timeout
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
      params: { alertId: ruleId, spaceId },
      state: { previousStartedAt },
    } = this.taskInstance;

    const ruleType = this.ruleTypeRegistry.get(rule.alertTypeId);
    const ruleLabel = `${ruleType.id}:${ruleId}: '${rule.name}'`;
    const ruleRunMetricsStore = new RuleRunMetricsStore();

    const maintenanceWindowClient = this.context.getMaintenanceWindowClientWithRequest(fakeRequest);
    let activeMaintenanceWindows: MaintenanceWindow[] = [];
    try {
      activeMaintenanceWindows = await maintenanceWindowClient.getActiveMaintenanceWindows();
    } catch (err) {
      this.logger.error(
        `error getting active maintenance window for ${rule.alertTypeId}:${ruleId} ${err.message}`
      );
    }

    const maintenanceWindowIds = activeMaintenanceWindows
      .filter(({ categoryIds }) => {
        // If category IDs array doesn't exist: allow all
        if (!Array.isArray(categoryIds)) {
          return true;
        }
        // If category IDs array exist: check category
        if ((categoryIds as string[]).includes(ruleType.category)) {
          return true;
        }
        return false;
      })
      .map(({ id }) => id);

    if (maintenanceWindowIds.length) {
      this.alertingEventLogger.setMaintenanceWindowIds(maintenanceWindowIds);
    }

    const { updatedRuleTypeState, gap } = await this.ruleRunner.run({
      alertingEventLogger: this.alertingEventLogger,
      executionId: this.executionId,
      executorServices: await getExecutorServices({
        context: this.context,
        fakeRequest,
        abortController: this.searchAbortController,
        logger: this.logger,
        ruleMonitoringService: this.ruleMonitoringAndGaps,
        ruleResultService: this.ruleResult,
        ruleData: { name: rule.name, alertTypeId: rule.alertTypeId, id: rule.id, spaceId },
      }),
      fakeRequest,
      rule: {
        id: ruleId,
        name: rule.name,
        tags: rule.tags,
        consumer: rule.consumer,
        producer: ruleType.producer,
        revision: rule.revision,
        ruleTypeId: rule.alertTypeId,
        ruleTypeName: ruleType.name,
        enabled: rule.enabled,
        schedule: rule.schedule,
        actions: rule.actions,
        createdBy: rule.createdBy,
        updatedBy: rule.updatedBy,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
        throttle: rule.throttle,
        notifyWhen: rule.notifyWhen,
        muteAll: rule.muteAll,
        snoozeSchedule: rule.snoozeSchedule,
      },
      ruleId,
      ruleLabel,
      ruleRunMetricsStore,
      spaceId,
      startedAt: this.taskInstance.startedAt,
      state: this.taskInstance.state,
      validatedParams: params,
    });
    this.ruleMonitoringAndGaps.addGap(gap);

    const executionHandler = new ExecutionHandler({
      rule,
      ruleType: this.ruleType,
      logger: this.logger,
      taskRunnerContext: this.context,
      taskInstance: this.taskInstance,
      ruleRunMetricsStore,
      apiKey,
      ruleConsumer: this.ruleConsumer!,
      executionId: this.executionId,
      ruleLabel,
      previousStartedAt: previousStartedAt ? new Date(previousStartedAt) : null,
      alertingEventLogger: this.alertingEventLogger,
      actionsClient: await this.context.actionsPlugin.getActionsClientWithRequest(fakeRequest),
      maintenanceWindowIds,
      alertsClient: this.ruleRunner.alertsClient,
    });

    let executionHandlerRunResult: RunResult = { throttledSummaryActions: {} };

    await this.timer.runWithTimer(TaskRunnerTimerSpan.TriggerActions, async () => {
      if (isRuleSnoozed(rule)) {
        this.logger.debug(`no scheduling of actions for rule ${ruleLabel}: rule is snoozed.`);
      } else if (!this.shouldLogAndScheduleActionsForAlerts()) {
        this.logger.debug(
          `no scheduling of actions for rule ${ruleLabel}: rule execution has been cancelled.`
        );
        this.countUsageOfActionExecutionAfterRuleCancellation();
      } else {
        executionHandlerRunResult = await executionHandler.run({
          ...this.ruleRunner.alertsClient.getProcessedAlerts('activeCurrent'),
          ...this.ruleRunner.alertsClient.getProcessedAlerts('recoveredCurrent'),
        });
      }
    });

    let alertsToReturn: Record<string, RawAlertInstance> = {};
    let recoveredAlertsToReturn: Record<string, RawAlertInstance> = {};

    // Only serialize alerts into task state if we're auto-recovering, otherwise
    // we don't need to keep this information around.
    if (this.ruleType.autoRecoverAlerts) {
      const { alertsToReturn: alerts, recoveredAlertsToReturn: recovered } =
        this.ruleRunner.alertsClient.getAlertsToSerialize();
      alertsToReturn = alerts;
      recoveredAlertsToReturn = recovered;
    }

    return {
      metrics: ruleRunMetricsStore.getMetrics(),
      alertTypeState: updatedRuleTypeState || undefined,
      alertInstances: alertsToReturn,
      alertRecoveredInstances: recoveredAlertsToReturn,
      summaryActions: executionHandlerRunResult.throttledSummaryActions,
    };
  }

  /**
   * Initialize event logger, load and validate the rule
   */
  private async prepareToRun(): Promise<ValidatedRuleData<Params>> {
    return await this.timer.runWithTimer(TaskRunnerTimerSpan.PrepareToRun, async () => {
      const {
        params: { alertId: ruleId, spaceId, consumer },
        startedAt,
      } = this.taskInstance;

      this.runDate = new Date();
      this.ruleRunning.start(ruleId, this.context.spaceIdToNamespace(spaceId));

      this.logger.debug(
        `executing rule ${this.ruleType.id}:${ruleId} at ${this.runDate.toISOString()}`
      );

      if (startedAt) {
        // Capture how long it took for the rule to start running after being claimed
        this.timer.setDuration(TaskRunnerTimerSpan.StartTaskRun, startedAt);
      }

      if (!this.ruleData) {
        this.ruleData = await this.loadIndirectParams();
      }

      if (apm.currentTransaction) {
        apm.currentTransaction.name = `Execute Alerting Rule`;
        apm.currentTransaction.addLabels({
          alerting_rule_space_id: spaceId,
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
        ruleType: this.ruleType as unknown as UntypedNormalizedRuleType,
        consumer: this.ruleConsumer!,
        spaceId,
        executionId: this.executionId,
        taskScheduledAt: this.taskInstance.scheduledAt,
        ...(namespace ? { namespace } : {}),
      });

      this.alertingEventLogger.start(this.runDate);

      const preparedResult = validateRule({
        alertingEventLogger: this.alertingEventLogger,
        ruleData: this.ruleData,
        paramValidator: this.ruleType.validate.params,
        ruleId,
        spaceId,
        context: this.context,
        ruleTypeRegistry: this.ruleTypeRegistry,
      });

      this.ruleMonitoringAndGaps.setMonitoring(preparedResult.rule.monitoring);
      this.ruleMonitoringAndGaps.setGaps(preparedResult.rule.executionGaps);

      (async () => {
        try {
          await preparedResult.rulesClient.clearExpiredSnoozes({
            rule: preparedResult.rule,
            version: preparedResult.version,
          });
        } catch (e) {
          // Most likely a 409 conflict error, which is ok, we'll try again at the next rule run
          this.logger.debug(`Failed to clear expired snoozes: ${e.message}`);
        }
      })();

      return preparedResult;
    });
  }

  private async processRunResults({
    schedule,
    stateWithMetrics,
  }: {
    schedule: Result<IntervalSchedule, Error>;
    stateWithMetrics: Result<RuleTaskStateAndMetrics, Error>;
  }) {
    return await this.timer.runWithTimer(TaskRunnerTimerSpan.ProcessRuleRun, async () => {
      const {
        params: { alertId: ruleId, spaceId },
        startedAt,
        schedule: taskSchedule,
      } = this.taskInstance;

      let nextRun: string | null = null;
      if (isOk(schedule)) {
        nextRun = getNextRun({ startDate: startedAt, interval: schedule.value.interval });
      } else if (taskSchedule) {
        nextRun = getNextRun({ startDate: startedAt, interval: taskSchedule.interval });
      }

      const namespace = this.context.spaceIdToNamespace(spaceId);

      // Getting executionStatus for backwards compatibility
      const { status: executionStatus } = map<
        RuleTaskStateAndMetrics,
        ElasticsearchError,
        IExecutionStatusAndMetrics
      >(
        stateWithMetrics,
        (ruleRunStateWithMetrics) =>
          executionStatusFromState(ruleRunStateWithMetrics, this.runDate),
        (err: ElasticsearchError) => executionStatusFromError(err, this.runDate)
      );

      // New consolidated statuses for lastRun
      const { lastRun, metrics: executionMetrics } = map<
        RuleTaskStateAndMetrics,
        ElasticsearchError,
        ILastRun
      >(
        stateWithMetrics,
        (ruleRunStateWithMetrics) =>
          lastRunFromState(ruleRunStateWithMetrics.metrics, this.ruleResult),
        (err: ElasticsearchError) => lastRunFromError(err)
      );

      if (apm.currentTransaction) {
        if (executionStatus.status === 'ok' || executionStatus.status === 'active') {
          apm.currentTransaction.setOutcome('success');
        } else if (executionStatus.status === 'error' || executionStatus.status === 'unknown') {
          apm.currentTransaction.setOutcome('failure');
        } else if (lastRun.outcome === 'succeeded') {
          apm.currentTransaction.setOutcome('success');
        } else if (lastRun.outcome === 'failed') {
          apm.currentTransaction.setOutcome('failure');
        }
      }

      this.logger.debug(
        `deprecated ruleRunStatus for ${this.ruleType.id}:${ruleId}: ${JSON.stringify(
          executionStatus
        )}`
      );
      this.logger.debug(
        `ruleRunStatus for ${this.ruleType.id}:${ruleId}: ${JSON.stringify(lastRun)}`
      );
      if (executionMetrics) {
        this.logger.debug(
          `ruleRunMetrics for ${this.ruleType.id}:${ruleId}: ${JSON.stringify(executionMetrics)}`
        );
      }

      // set start and duration based on event log
      const { start, duration } = this.alertingEventLogger.getStartAndDuration();
      if (null != start) {
        executionStatus.lastExecutionDate = start;
      }
      if (null != duration) {
        executionStatus.lastDuration = nanosToMillis(duration);
      }

      // if executionStatus indicates an error, fill in fields in
      this.ruleMonitoringAndGaps.addHistory({
        duration: executionStatus.lastDuration,
        hasError: executionStatus.error != null,
        runDate: this.runDate,
      });

      if (!this.cancelled) {
        this.inMemoryMetrics.increment(IN_MEMORY_METRICS.RULE_EXECUTIONS);
        if (lastRun.outcome === 'failed') {
          this.inMemoryMetrics.increment(IN_MEMORY_METRICS.RULE_FAILURES);
        } else if (executionStatus.error) {
          this.inMemoryMetrics.increment(IN_MEMORY_METRICS.RULE_FAILURES);
        }
        this.logger.debug(
          `Updating rule task for ${this.ruleType.id} rule with id ${ruleId} - ${JSON.stringify(
            executionStatus
          )} - ${JSON.stringify(lastRun)}`
        );
        await this.updateRuleSavedObjectPostRun(ruleId, namespace, {
          executionStatus: ruleExecutionStatusToRaw(executionStatus),
          nextRun,
          lastRun: lastRunToRaw(lastRun),
          monitoring: this.ruleMonitoringAndGaps.getMonitoring() as RawRuleMonitoring,
          executionGaps: this.ruleMonitoringAndGaps.getGaps() as RawRuleExecutionGap[],
        });
      }

      if (startedAt) {
        // Capture how long it took for the rule to run after being claimed
        this.timer.setDuration(TaskRunnerTimerSpan.TotalRunDuration, startedAt);
      }

      this.alertingEventLogger.done({
        status: executionStatus,
        metrics: executionMetrics,
        timings: this.timer.toJson(),
      });
    });
  }

  public async loadIndirectParams(): Promise<RuleDataResult<RuleData<Params>>> {
    return await this.timer.runWithTimer(TaskRunnerTimerSpan.LoadSavedObject, async () => {
      // Used by task manager to validate task params before running
      try {
        const {
          params: { alertId: ruleId, spaceId },
        } = this.taskInstance;
        const data = await getRuleAttributes<Params>(this.context, ruleId, spaceId);
        this.ruleData = { data };
      } catch (err) {
        const error = new ErrorWithReason(RuleExecutionStatusErrorReasons.Decrypt, err);
        this.ruleData = { error };
      }
      return this.ruleData;
    });
  }

  async run(): Promise<RuleTaskRunResult> {
    const {
      params: { alertId: ruleId, spaceId },
      startedAt,
      state: originalState,
      schedule: taskSchedule,
    } = this.taskInstance;

    let stateWithMetrics: Result<RuleTaskStateAndMetrics, Error>;
    let schedule: Result<IntervalSchedule, Error>;
    try {
      const runParams = await this.prepareToRun();
      stateWithMetrics = asOk(await this.runRule(runParams));

      // fetch the rule again to ensure we return the correct schedule as it may have
      // changed during the task execution
      const attributes = await getRuleAttributes<Params>(this.context, ruleId, spaceId);
      schedule = asOk(attributes.rule.schedule);
    } catch (err) {
      stateWithMetrics = asErr(err);
      schedule = asErr(err);
    }

    await this.processRunResults({ schedule, stateWithMetrics });

    const transformRunStateToTaskState = (
      runStateWithMetrics: RuleTaskStateAndMetrics
    ): RuleTaskState => {
      return {
        ...omit(runStateWithMetrics, ['metrics']),
        previousStartedAt: startedAt?.toISOString(),
      };
    };

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
      monitoring: this.ruleMonitoringAndGaps.getMonitoring(),
      ...(isErr(schedule)
        ? { taskRunError: createTaskRunError(schedule.error, TaskErrorSource.FRAMEWORK) }
        : {}),
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
      schedule: taskSchedule,
      startedAt,
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

    let nextRun: string | null = null;
    if (taskSchedule) {
      nextRun = getNextRun({ startDate: startedAt, interval: taskSchedule.interval });
    }

    const outcomeMsg = [
      `${this.ruleType.id}:${ruleId}: execution cancelled due to timeout - exceeded rule type timeout of ${this.ruleType.ruleTaskTimeout}`,
    ];
    const date = new Date();
    // Update the rule saved object with execution status
    const executionStatus: RuleExecutionStatus = {
      lastExecutionDate: date,
      status: 'error',
      error: {
        reason: RuleExecutionStatusErrorReasons.Timeout,
        message: outcomeMsg.join(' '),
      },
    };
    this.logger.debug(
      `Updating rule task for ${this.ruleType.id} rule with id ${ruleId} - execution error due to timeout`
    );
    const outcome = 'failed';
    await this.updateRuleSavedObjectPostRun(ruleId, namespace, {
      executionStatus: ruleExecutionStatusToRaw(executionStatus),
      lastRun: {
        outcome,
        outcomeOrder: RuleLastRunOutcomeOrderMap[outcome],
        warning: RuleExecutionStatusErrorReasons.Timeout,
        outcomeMsg,
        alertsCount: {},
      },
      monitoring: this.ruleMonitoringAndGaps.getMonitoring() as RawRuleMonitoring,
      nextRun: nextRun && new Date(nextRun).getTime() > date.getTime() ? nextRun : null,
    });
  }
}
