/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import { v4 as uuidv4 } from 'uuid';
import {
  ISavedObjectsRepository,
  KibanaRequest,
  Logger,
  SavedObject,
  SavedObjectsErrorHelpers,
} from '@kbn/core/server';
import {
  ConcreteTaskInstance,
  createTaskRunError,
  TaskErrorSource,
} from '@kbn/task-manager-plugin/server';
import { nanosToMillis } from '@kbn/event-log-plugin/common';
import { RunResult } from '@kbn/task-manager-plugin/server/task';
import { AdHocRunStatus, adHocRunStatus } from '../../common/constants';
import { RuleRunnerErrorStackTraceLog, RuleTaskStateAndMetrics, TaskRunnerContext } from './types';
import { getExecutorServices } from './get_executor_services';
import { ErrorWithReason, validateRuleTypeParams } from '../lib';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleAlertData,
  RuleExecutionStatusErrorReasons,
  RuleTypeParams,
  RuleTypeRegistry,
  RuleTypeState,
} from '../types';
import { TaskRunnerTimer, TaskRunnerTimerSpan } from './task_runner_timer';
import { AdHocRun, AdHocRunSchedule, AdHocRunSO } from '../data/ad_hoc_run/types';
import { AD_HOC_RUN_SAVED_OBJECT_TYPE } from '../saved_objects';
import { RuleMonitoringService } from '../monitoring/rule_monitoring_service';
import { AdHocTaskRunningHandler } from './ad_hoc_task_running_handler';
import { getFakeKibanaRequest } from './rule_loader';
import { RuleResultService } from '../monitoring/rule_result_service';
import { RuleTypeRunner } from './rule_type_runner';
import { initializeAlertsClient } from '../alerts_client';
import { partiallyUpdateAdHocRun, processRunResults } from './lib';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import {
  AlertingEventLogger,
  executionType,
} from '../lib/alerting_event_logger/alerting_event_logger';
import { RuleRunMetrics, RuleRunMetricsStore } from '../lib/rule_run_metrics_store';
import { getEsErrorMessage } from '../lib/errors';
import { Result, isOk, asOk, asErr } from '../lib/result_type';

interface ConstructorParams {
  context: TaskRunnerContext;
  internalSavedObjectsRepository: ISavedObjectsRepository;
  taskInstance: ConcreteTaskInstance;
}

interface RunParams {
  adHocRunData: AdHocRun;
  fakeRequest: KibanaRequest;
  scheduleToRun: AdHocRunSchedule | null;
  validatedParams: RuleTypeParams;
}

export class AdHocTaskRunner {
  private readonly context: TaskRunnerContext;
  private readonly executionId: string;
  private readonly internalSavedObjectsRepository: ISavedObjectsRepository;
  private readonly ruleTypeRegistry: RuleTypeRegistry;
  private readonly taskInstance: ConcreteTaskInstance;

  private adHocRunSchedule: AdHocRunSchedule[] = [];
  private alertingEventLogger: AlertingEventLogger;
  private cancelled: boolean = false;
  private logger: Logger;
  private ruleId: string = '';
  private ruleMonitoring: RuleMonitoringService;
  private ruleResult: RuleResultService;
  private ruleTypeId: string = '';
  private ruleTypeRunner: RuleTypeRunner<
    RuleTypeParams,
    RuleTypeParams,
    RuleTypeState,
    AlertInstanceState,
    AlertInstanceContext,
    string,
    string,
    RuleAlertData
  >;
  private runDate = new Date();
  private scheduleToRunIndex: number = -1;
  private searchAbortController: AbortController;
  private shouldDeleteTask: boolean = false;
  private stackTraceLog: RuleRunnerErrorStackTraceLog | null = null;
  private taskRunning: AdHocTaskRunningHandler;
  private timer: TaskRunnerTimer;

  constructor({ context, internalSavedObjectsRepository, taskInstance }: ConstructorParams) {
    this.context = context;
    this.executionId = uuidv4();
    this.internalSavedObjectsRepository = internalSavedObjectsRepository;
    this.ruleTypeRegistry = context.ruleTypeRegistry;
    this.taskInstance = taskInstance;

    this.alertingEventLogger = new AlertingEventLogger(this.context.eventLogger);
    this.logger = context.logger.get(`ad_hoc_run`);
    this.ruleMonitoring = new RuleMonitoringService();
    this.ruleResult = new RuleResultService();
    this.timer = new TaskRunnerTimer({ logger: this.logger });
    this.ruleTypeRunner = new RuleTypeRunner<
      RuleTypeParams,
      RuleTypeParams,
      RuleTypeState,
      AlertInstanceState,
      AlertInstanceContext,
      string,
      string,
      RuleAlertData
    >({
      context: this.context,
      logger: this.logger,
      task: this.taskInstance,
      timer: this.timer,
    });
    this.searchAbortController = new AbortController();
    this.taskRunning = new AdHocTaskRunningHandler(
      this.internalSavedObjectsRepository,
      this.logger
    );
  }

  private async updateAdHocRunSavedObjectPostRun(
    adHocRunParamsId: string,
    namespace: string | undefined,
    { status, schedule }: { status?: AdHocRunStatus; schedule?: AdHocRunSchedule[] }
  ) {
    try {
      // Checking to see if the update performed at the beginning
      // of the run is complete. Swallowing the error because we still
      // want to move forward with the update post-run
      await this.taskRunning.waitFor();
      // eslint-disable-next-line no-empty
    } catch {}

    try {
      await partiallyUpdateAdHocRun(
        this.internalSavedObjectsRepository,
        adHocRunParamsId,
        { ...(status ? { status } : {}), ...(schedule ? { schedule } : {}) },
        {
          ignore404: true,
          namespace,
          refresh: false,
        }
      );
    } catch (err) {
      this.logger.error(`error updating ad hoc run ${adHocRunParamsId} ${err.message}`);
    }
  }

  private async runRule({
    adHocRunData,
    fakeRequest,
    scheduleToRun,
    validatedParams: params,
  }: RunParams): Promise<RuleRunMetrics> {
    const ruleRunMetricsStore = new RuleRunMetricsStore();
    if (scheduleToRun == null) {
      return ruleRunMetricsStore.getMetrics();
    }

    const { rule } = adHocRunData;
    const ruleType = this.ruleTypeRegistry.get(rule.alertTypeId);

    const ruleLabel = `${ruleType.id}:${rule.id}: '${rule.name}'`;
    const ruleTypeRunnerContext = {
      alertingEventLogger: this.alertingEventLogger,
      namespace: this.context.spaceIdToNamespace(adHocRunData.spaceId),
      ruleId: rule.id,
      ruleLogPrefix: ruleLabel,
      ruleRunMetricsStore,
      spaceId: adHocRunData.spaceId,
    };
    const alertsClient = await initializeAlertsClient<
      RuleTypeParams,
      RuleAlertData,
      AlertInstanceState,
      AlertInstanceContext,
      string,
      string
    >({
      alertsService: this.context.alertsService,
      context: ruleTypeRunnerContext,
      executionId: this.executionId,
      logger: this.logger,
      maxAlerts: this.context.maxAlerts,
      rule: {
        id: rule.id,
        name: rule.name,
        tags: rule.tags,
        consumer: rule.consumer,
        revision: rule.revision,
        params: rule.params,
      },
      ruleType,
      runTimestamp: this.runDate,
      startedAt: new Date(scheduleToRun.runAt),
      taskInstance: this.taskInstance,
    });

    const executorServices = await getExecutorServices({
      context: this.context,
      fakeRequest,
      abortController: this.searchAbortController,
      logger: this.logger,
      ruleMonitoringService: this.ruleMonitoring,
      ruleResultService: this.ruleResult,
      ruleData: {
        name: rule.name,
        alertTypeId: rule.alertTypeId,
        id: rule.id,
        spaceId: adHocRunData.spaceId,
      },
      ruleTaskTimeout: ruleType.ruleTaskTimeout,
    });

    const { error, stackTrace } = await this.ruleTypeRunner.run({
      context: ruleTypeRunnerContext,
      alertsClient,
      executionId: this.executionId,
      executorServices,
      rule: {
        ...rule,
        actions: [],
        muteAll: false,
        createdAt: new Date(rule.createdAt),
        updatedAt: new Date(rule.updatedAt),
      },
      ruleType,
      startedAt: new Date(scheduleToRun.runAt),
      state: this.taskInstance.state,
      validatedParams: params,
    });

    // if there was an error, save the stack trace and throw
    if (error) {
      this.stackTraceLog = stackTrace ?? null;
      throw error;
    }

    return ruleRunMetricsStore.getMetrics();
  }

  /**
   * Before we actually kick off the ad hoc run:
   * - read decrypted ad hoc run SO
   * - start the RunningHandler
   * - initialize the event logger
   * - set the current APM transaction info
   * - validate that rule type is enabled and params are valid
   */
  private async prepareToRun(): Promise<RunParams> {
    this.runDate = new Date();
    return await this.timer.runWithTimer(TaskRunnerTimerSpan.PrepareRule, async () => {
      const {
        params: { adHocRunParamsId, spaceId },
        startedAt,
      } = this.taskInstance;

      const namespace = this.context.spaceIdToNamespace(spaceId);

      this.alertingEventLogger.initialize({
        context: {
          savedObjectId: adHocRunParamsId,
          savedObjectType: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          spaceId,
          executionId: this.executionId,
          taskScheduledAt: this.taskInstance.scheduledAt,
          ...(namespace ? { namespace } : {}),
        },
        runDate: this.runDate,
        // in the future we might want different types of ad hoc runs (like preview)
        type: executionType.BACKFILL,
      });

      let adHocRunData: AdHocRun;

      try {
        const adHocRunSO: SavedObject<AdHocRunSO> =
          await this.context.encryptedSavedObjectsClient.getDecryptedAsInternalUser<AdHocRunSO>(
            AD_HOC_RUN_SAVED_OBJECT_TYPE,
            adHocRunParamsId,
            { namespace }
          );

        adHocRunData = {
          id: adHocRunSO.id,
          ...adHocRunSO.attributes,
          rule: {
            ...adHocRunSO.attributes.rule,
            id: adHocRunSO.references[0].id,
          },
        };
      } catch (err) {
        const errorSource = SavedObjectsErrorHelpers.isNotFoundError(err)
          ? TaskErrorSource.USER
          : TaskErrorSource.FRAMEWORK;

        throw createTaskRunError(
          new ErrorWithReason(RuleExecutionStatusErrorReasons.Decrypt, err),
          errorSource
        );
      }

      const { rule, apiKeyToUse, schedule } = adHocRunData;

      let ruleType: UntypedNormalizedRuleType;
      try {
        ruleType = this.ruleTypeRegistry.get(rule.alertTypeId);
      } catch (err) {
        throw createTaskRunError(
          new ErrorWithReason(RuleExecutionStatusErrorReasons.Read, err),
          TaskErrorSource.FRAMEWORK
        );
      }

      this.ruleTypeId = ruleType.id;
      this.ruleId = rule.id;
      this.alertingEventLogger.addOrUpdateRuleData({
        id: rule.id,
        type: ruleType,
        name: rule.name,
        consumer: rule.consumer,
        revision: rule.revision,
      });

      try {
        this.ruleTypeRegistry.ensureRuleTypeEnabled(rule.alertTypeId);
      } catch (err) {
        throw createTaskRunError(
          new ErrorWithReason(RuleExecutionStatusErrorReasons.License, err),
          TaskErrorSource.USER
        );
      }

      let validatedParams: RuleTypeParams;
      try {
        validatedParams = validateRuleTypeParams<RuleTypeParams>(
          rule.params,
          ruleType.validate.params
        );
      } catch (err) {
        throw createTaskRunError(
          new ErrorWithReason(RuleExecutionStatusErrorReasons.Validate, err),
          TaskErrorSource.USER
        );
      }

      if (apm.currentTransaction) {
        apm.currentTransaction.name = `Execute Backfill for Alerting Rule`;
        apm.currentTransaction.addLabels({
          alerting_rule_space_id: spaceId,
          alerting_rule_id: rule.id,
          alerting_rule_consumer: rule.consumer,
          alerting_rule_name: rule.name,
          alerting_rule_tags: rule.tags.join(', '),
          alerting_rule_type_id: rule.alertTypeId,
          alerting_rule_params: JSON.stringify(rule.params),
        });
      }

      if (startedAt) {
        // Capture how long it took for the task to start running after being claimed
        this.timer.setDuration(TaskRunnerTimerSpan.StartTaskRun, startedAt);
      }

      // Determine which schedule entry we're going to run
      // Find the first index where the status is pending
      this.adHocRunSchedule = schedule;
      this.scheduleToRunIndex = (this.adHocRunSchedule ?? []).findIndex(
        (s: AdHocRunSchedule) => s.status === adHocRunStatus.PENDING
      );
      if (this.scheduleToRunIndex > -1) {
        this.logger.debug(
          `Executing ad hoc run for rule ${ruleType.id}:${rule.id} for runAt ${
            this.adHocRunSchedule[this.scheduleToRunIndex].runAt
          }`
        );
        this.adHocRunSchedule[this.scheduleToRunIndex].status = adHocRunStatus.RUNNING;
        this.taskRunning.start(
          adHocRunParamsId,
          schedule,
          this.context.spaceIdToNamespace(spaceId)
        );
      }

      // Generate fake request with API key
      const fakeRequest = getFakeKibanaRequest(this.context, spaceId, apiKeyToUse);

      return {
        adHocRunData,
        fakeRequest,
        scheduleToRun:
          this.scheduleToRunIndex > -1 ? this.adHocRunSchedule[this.scheduleToRunIndex] : null,
        validatedParams,
      };
    });
  }

  private async processAdHocRunResults(ruleRunMetrics: Result<RuleTaskStateAndMetrics, Error>) {
    const {
      params: { adHocRunParamsId, spaceId },
      startedAt,
    } = this.taskInstance;
    const namespace = this.context.spaceIdToNamespace(spaceId);

    const { executionStatus: execStatus, executionMetrics: execMetrics } =
      await this.timer.runWithTimer(TaskRunnerTimerSpan.ProcessRuleRun, async () => {
        const { executionStatus, executionMetrics, outcome } = processRunResults({
          result: this.ruleResult,
          runDate: this.runDate,
          runResultWithMetrics: ruleRunMetrics,
        });

        if (!isOk(ruleRunMetrics)) {
          const error = this.stackTraceLog ? this.stackTraceLog.message : ruleRunMetrics.error;
          const stack = this.stackTraceLog
            ? this.stackTraceLog.stackTrace
            : ruleRunMetrics.error.stack;
          const message = `Executing ad hoc run with id "${adHocRunParamsId}" has resulted in Error: ${getEsErrorMessage(
            error
          )} - ${stack ?? ''}`;
          const tags = [adHocRunParamsId, 'rule-ad-hoc-run-failed'];
          if (this.ruleTypeId.length > 0) {
            tags.push(this.ruleTypeId);
          }
          if (this.ruleId.length > 0) {
            tags.push(this.ruleId);
          }
          this.logger.error(message, { tags, error: { stack_trace: stack } });
        }

        if (apm.currentTransaction) {
          apm.currentTransaction.setOutcome(outcome);
        }

        // set start and duration based on event log
        const { start, duration } = this.alertingEventLogger.getStartAndDuration();
        if (null != start) {
          executionStatus.lastExecutionDate = start;
        }
        if (null != duration) {
          executionStatus.lastDuration = nanosToMillis(duration);
        }

        if (this.scheduleToRunIndex > -1) {
          let updatedStatus: AdHocRunStatus = adHocRunStatus.COMPLETE;
          if (this.cancelled) {
            updatedStatus = adHocRunStatus.TIMEOUT;
          } else if (outcome === 'failure') {
            updatedStatus = adHocRunStatus.ERROR;
          }
          this.adHocRunSchedule[this.scheduleToRunIndex].status = updatedStatus;
        }

        // If execution failed due to decrypt error, we should stop running the task
        // If the user wants to rerun it, they can reschedule
        // In the future, we can consider saving the task in an error state when we
        // have one or both of the following abilities
        // - ability to rerun a failed ad hoc run
        // - ability to clean up failed ad hoc runs (either manually or automatically)
        this.shouldDeleteTask =
          executionStatus.status === 'error' &&
          (executionStatus?.error?.reason === RuleExecutionStatusErrorReasons.Decrypt ||
            executionStatus?.error?.reason === RuleExecutionStatusErrorReasons.Read ||
            executionStatus?.error?.reason === RuleExecutionStatusErrorReasons.License ||
            executionStatus?.error?.reason === RuleExecutionStatusErrorReasons.Validate);

        await this.updateAdHocRunSavedObjectPostRun(adHocRunParamsId, namespace, {
          ...(this.shouldDeleteTask ? { status: adHocRunStatus.ERROR } : {}),
          ...(this.scheduleToRunIndex > -1 ? { schedule: this.adHocRunSchedule } : {}),
        });

        if (startedAt) {
          // Capture how long it took for the rule to run after being claimed
          this.timer.setDuration(TaskRunnerTimerSpan.TotalRunDuration, startedAt);
        }
        return { executionStatus, executionMetrics };
      });
    this.alertingEventLogger.done({
      status: execStatus,
      metrics: execMetrics,
      // in the future if we have other types of ad hoc runs (like preview)
      // we can differentiate and pass in different info
      backfill: {
        id: adHocRunParamsId,
        start:
          this.scheduleToRunIndex > -1
            ? this.adHocRunSchedule[this.scheduleToRunIndex].runAt
            : undefined,
        interval:
          this.scheduleToRunIndex > -1
            ? this.adHocRunSchedule[this.scheduleToRunIndex].interval
            : undefined,
      },
      timings: this.timer.toJson(),
    });
  }

  private hasAnyPendingRuns(): boolean {
    let hasPendingRuns = false;
    const anyPendingRuns = this.adHocRunSchedule.findIndex(
      (s: AdHocRunSchedule) => s.status === adHocRunStatus.PENDING
    );
    if (anyPendingRuns > -1) {
      hasPendingRuns = true;
    }
    return hasPendingRuns;
  }

  async run(): Promise<RunResult> {
    let runMetrics: Result<RuleTaskStateAndMetrics, Error>;
    try {
      const runParams = await this.prepareToRun();
      runMetrics = asOk({ metrics: await this.runRule(runParams) });
    } catch (err) {
      runMetrics = asErr(err);
    }
    await this.processAdHocRunResults(runMetrics);

    this.shouldDeleteTask = this.shouldDeleteTask || !this.hasAnyPendingRuns();

    return {
      state: {},
      ...(this.shouldDeleteTask ? {} : { runAt: new Date() }),
    };
  }

  async cancel(): Promise<void> {
    if (this.cancelled) {
      return;
    }
    this.cancelled = true;
    this.searchAbortController.abort();
    this.ruleTypeRunner.cancelRun();

    // Write event log entry
    const {
      params: { adHocRunParamsId },
      timeoutOverride,
    } = this.taskInstance;

    this.logger.debug(
      `Cancelling execution for ad hoc run with id ${adHocRunParamsId} for rule type ${this.ruleTypeId} with id ${this.ruleId} - execution exceeded rule type timeout of ${timeoutOverride}`
    );
    this.logger.debug(
      `Aborting any in-progress ES searches for rule type ${this.ruleTypeId} with id ${this.ruleId}`
    );
    this.alertingEventLogger.logTimeout({
      backfill: {
        id: adHocRunParamsId,
        start:
          this.scheduleToRunIndex > -1
            ? this.adHocRunSchedule[this.scheduleToRunIndex].runAt
            : undefined,
        interval:
          this.scheduleToRunIndex > -1
            ? this.adHocRunSchedule[this.scheduleToRunIndex].interval
            : undefined,
      },
    });
  }

  async cleanup() {
    if (!this.shouldDeleteTask) return;

    try {
      await this.internalSavedObjectsRepository.delete(
        AD_HOC_RUN_SAVED_OBJECT_TYPE,
        this.taskInstance.params.adHocRunParamsId,
        {
          refresh: false,
          namespace: this.context.spaceIdToNamespace(this.taskInstance.params.spaceId),
        }
      );
    } catch (e) {
      // Log error only, we shouldn't fail the task because of an error here (if ever there's retry logic)
      this.logger.error(
        `Failed to cleanup ${AD_HOC_RUN_SAVED_OBJECT_TYPE} object [id="${this.taskInstance.params.adHocRunParamsId}"]: ${e.message}`
      );
    }
  }
}
