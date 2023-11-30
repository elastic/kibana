/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { ISavedObjectsRepository, KibanaRequest, Logger } from '@kbn/core/server';
import { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import {
  LoadedIndirectParams,
  LoadIndirectParamsResult,
} from '@kbn/task-manager-plugin/server/task';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { parseDuration } from '@kbn/actions-plugin/server/lib/parse_date';
import { nanosToMillis } from '@kbn/event-log-plugin/common';
import {
  RuleTypeRegistry,
  AdHocRuleRunParams,
  RuleExecutionStatusErrorReasons,
  RuleTypeParams,
  RuleAlertData,
  AlertInstanceState,
  AlertInstanceContext,
} from '../types';
import type { TaskRunnerContext } from '../task_runner/types';
import { getFakeKibanaRequest } from '../task_runner/rule_loader';
import { ElasticsearchError, ErrorWithReason, validateRuleTypeParams } from '../lib';
import { RuleRunMetrics, RuleRunMetricsStore } from '../lib/rule_run_metrics_store';
import { RuleRunner } from '../task_runner/rule_runner';
import { RuleMonitoringService } from '../monitoring/rule_monitoring_service';
import { RuleResultService } from '../monitoring/rule_result_service';
import { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';
import { getExecutorServices } from '../task_runner/get_executor_services';
import { getTimeRange } from '../lib/get_time_range';
import { TaskRunnerTimer, TaskRunnerTimerSpan } from '../task_runner/task_runner_timer';
import { asErr, asOk, map, Result } from '../lib/result_type';
import { ILastRun, lastRunFromError, lastRunFromState } from '../lib/last_run_status';
import {
  executionStatusFromError,
  executionStatusFromState,
  IExecutionStatusAndMetrics,
} from '../lib/rule_execution_status';
import { EVENT_LOG_ACTIONS } from '../plugin';

type AdHocRuleRunParamResult<T extends LoadedIndirectParams> = LoadIndirectParamsResult<T>;
interface AdHocRuleRunData extends LoadedIndirectParams<AdHocRuleRunParams> {
  indirectParams: AdHocRuleRunParams;
}

interface ConstructorOpts {
  taskInstance: ConcreteTaskInstance;
  context: TaskRunnerContext;
  internalSavedObjectsRepository: ISavedObjectsRepository;
}

export interface AdHocRuleTaskRunResult {
  state: {};
  runAt?: Date;
}

interface RunRuleParams {
  fakeRequest: KibanaRequest;
  ruleRunParams: AdHocRuleRunParams;
  validatedParams: RuleTypeParams;
}

export class AdHocTaskRunner {
  private context: TaskRunnerContext;
  private runDate = new Date();
  private logger: Logger;
  private taskInstance: ConcreteTaskInstance;
  private alertingEventLogger: AlertingEventLogger;
  private readonly executionId: string;
  private readonly ruleTypeRegistry: RuleTypeRegistry;
  private readonly internalSavedObjectsRepository: ISavedObjectsRepository;
  private timer: TaskRunnerTimer;
  private searchAbortController: AbortController;
  private cancelled: boolean;
  private ruleMonitoring: RuleMonitoringService;
  private ruleResult: RuleResultService;
  private ruleRunner: RuleRunner<
    RuleAlertData,
    AlertInstanceState,
    AlertInstanceContext,
    string,
    string
  >;
  private shouldDeleteTask: boolean = false;
  private adHocRuleRunData?: AdHocRuleRunParamResult<AdHocRuleRunData>;

  constructor({ context, internalSavedObjectsRepository, taskInstance }: ConstructorOpts) {
    this.context = context;
    this.logger = context.logger.get();
    this.taskInstance = taskInstance;
    this.ruleTypeRegistry = context.ruleTypeRegistry;
    this.internalSavedObjectsRepository = internalSavedObjectsRepository;
    this.timer = new TaskRunnerTimer({ logger: this.logger });
    this.alertingEventLogger = new AlertingEventLogger(this.context.eventLogger);
    this.searchAbortController = new AbortController();
    this.cancelled = false;
    this.executionId = uuidv4();
    this.ruleMonitoring = new RuleMonitoringService();
    this.ruleResult = new RuleResultService();
    this.ruleRunner = new RuleRunner<
      RuleAlertData,
      AlertInstanceState,
      AlertInstanceContext,
      string,
      string
    >({
      context: this.context,
      logger: this.logger,
      timer: this.timer,
      runCancelled: () => this.cancelled,
    });
  }

  private async runRule({
    fakeRequest,
    ruleRunParams,
    validatedParams: params,
  }: RunRuleParams): Promise<RuleRunMetrics> {
    const { rule, duration, currentStart, end } = ruleRunParams;
    const {
      params: { spaceId },
    } = this.taskInstance;

    this.logger.info(`taskInstance: ${JSON.stringify(this.taskInstance)}`);

    const ruleType = this.ruleTypeRegistry.get(rule.alertTypeId);
    const ruleLabel = `${ruleType.id}:${rule.id}: '${rule.name}'`;
    const ruleRunMetricsStore = new RuleRunMetricsStore();

    const services = await getExecutorServices({
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
        spaceId,
      },
    });

    const nowDate = new Date(new Date(currentStart).valueOf() + parseDuration(duration));
    const calculatedTimeRange = getTimeRange({
      logger: this.logger,
      nowDate: nowDate.toISOString(),
      window: duration,
    });

    if (end && new Date(calculatedTimeRange.dateEnd).valueOf() > new Date(end).valueOf()) {
      calculatedTimeRange.dateEnd = end;
    }

    await this.ruleRunner.run({
      alertingEventLogger: this.alertingEventLogger,
      executionId: this.executionId,
      executorServices: {
        ...services,
        getTimeRangeFn: () => ({
          dateStart: calculatedTimeRange.dateStart,
          dateEnd: calculatedTimeRange.dateEnd,
        }),
      },
      fakeRequest,
      rule: {
        id: rule.id,
        name: rule.name,
        tags: rule.tags,
        consumer: rule.consumer,
        producer: ruleType.producer,
        revision: rule.revision,
        ruleTypeId: rule.alertTypeId,
        ruleTypeName: ruleType.name,
        enabled: rule.enabled,
        schedule: rule.schedule,
        actions: [],
        createdBy: rule.createdBy,
        updatedBy: rule.updatedBy,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
        muteAll: false,
      },
      ruleId: rule.id,
      ruleLabel,
      ruleRunMetricsStore,
      spaceId,
      startedAt: nowDate,
      state: {},
      validatedParams: params,
    });

    return ruleRunMetricsStore.getMetrics();
  }

  public async loadIndirectParams(): Promise<AdHocRuleRunParamResult<AdHocRuleRunData>> {
    return await this.timer.runWithTimer(TaskRunnerTimerSpan.LoadSavedObject, async () => {
      // Used by task manager to validate task params before running
      try {
        const {
          params: { adHocRuleRunParamsId, spaceId },
        } = this.taskInstance;
        const namespace = this.context.spaceIdToNamespace(spaceId);

        const adHocRuleRunParams =
          await this.context.encryptedSavedObjectsClient.getDecryptedAsInternalUser<AdHocRuleRunParams>(
            'backfill_params',
            adHocRuleRunParamsId,
            { namespace }
          );

        this.logger.info(
          `AdHocTaskRunner loadIndirectParams loaded ${JSON.stringify(adHocRuleRunParams)}`
        );
        this.adHocRuleRunData = {
          data: { indirectParams: adHocRuleRunParams.attributes },
        };
      } catch (error) {
        this.adHocRuleRunData = { error };
      }
      return this.adHocRuleRunData;
    });
  }

  public async run(): Promise<AdHocRuleTaskRunResult> {
    let runMetrics: Result<RuleRunMetrics, Error>;
    try {
      const runParams = await this.prepareToRun();
      runMetrics = asOk(await this.runRule(runParams));
    } catch (err) {
      runMetrics = asErr(err);
      this.logger.error(`Error running ad-hoc rule - ${err.message}`);
    }

    await this.processRunResults(runMetrics);
    await this.scheduleNewOrDeleteTask();

    return { state: {}, ...(this.shouldDeleteTask ? {} : { runAt: new Date() }) };
  }

  public async cleanup() {
    if (!this.shouldDeleteTask) return;

    try {
      this.logger.info(`Deleting backfill_params ${this.taskInstance.params.adHocRuleRunParamsId}`);
      await this.internalSavedObjectsRepository.delete(
        'backfill_params',
        this.taskInstance.params.adHocRuleRunParamsId,
        {
          refresh: false,
          namespace: this.context.spaceIdToNamespace(this.taskInstance.params.spaceId),
        }
      );
    } catch (e) {
      // Log error only, we shouldn't fail the task because of an error here (if ever there's retry logic)
      this.logger.error(
        `Failed to cleanup backfill_params object [id="${this.taskInstance.params.adHocRuleRunParamsId}"]: ${e.message}`
      );
    }
  }

  public async cancel(): Promise<void> {
    if (this.cancelled) {
      return;
    }

    this.cancelled = true;
  }

  private async prepareToRun(): Promise<RunRuleParams> {
    return await this.timer.runWithTimer(TaskRunnerTimerSpan.PrepareToRun, async () => {
      this.runDate = new Date();

      if (!this.adHocRuleRunData) {
        this.adHocRuleRunData = await this.loadIndirectParams();
      }
      if (this.adHocRuleRunData.error) {
        throw this.adHocRuleRunData.error;
      }

      const adHocRuleRunParams: AdHocRuleRunParams = this.adHocRuleRunData.data.indirectParams;

      const namespace =
        this.context.spaceIdToNamespace(adHocRuleRunParams.spaceId) ?? DEFAULT_NAMESPACE_STRING;
      const ruleType = this.ruleTypeRegistry.get(adHocRuleRunParams.rule.alertTypeId);

      const { rule } = adHocRuleRunParams;

      this.alertingEventLogger.initialize({
        ruleId: rule.id,
        ruleType,
        consumer: rule.consumer,
        spaceId: adHocRuleRunParams.spaceId,
        executionId: this.executionId,
        taskScheduledAt: this.taskInstance.scheduledAt,
        ...(namespace ? { namespace } : {}),
      });

      this.alertingEventLogger.start(this.runDate, EVENT_LOG_ACTIONS.executeBackfill);
      this.alertingEventLogger.setRuleName(rule.name);

      // Generate fake request with API key
      const fakeRequest = getFakeKibanaRequest(
        this.context,
        adHocRuleRunParams.spaceId,
        adHocRuleRunParams.apiKeyToUse
      );

      // these are from validateRule
      try {
        this.ruleTypeRegistry.ensureRuleTypeEnabled(adHocRuleRunParams.rule.alertTypeId);
      } catch (err) {
        throw new ErrorWithReason(RuleExecutionStatusErrorReasons.License, err);
      }

      let validatedParams: RuleTypeParams;
      try {
        validatedParams = validateRuleTypeParams(
          adHocRuleRunParams.rule.params,
          ruleType.validate.params
        );
      } catch (err) {
        throw new ErrorWithReason(RuleExecutionStatusErrorReasons.Validate, err);
      }

      return {
        validatedParams,
        fakeRequest,
        ruleRunParams: adHocRuleRunParams,
      };
    });
  }

  private async processRunResults(runMetrics: Result<RuleRunMetrics, Error>) {
    return await this.timer.runWithTimer(TaskRunnerTimerSpan.ProcessRuleRun, async () => {
      const { startedAt } = this.taskInstance;

      // Getting executionStatus for backwards compatibility
      const { status: executionStatus } = map<
        RuleRunMetrics,
        ElasticsearchError,
        IExecutionStatusAndMetrics
      >(
        runMetrics,
        (metrics) => executionStatusFromState({ metrics }, this.runDate),
        (err: ElasticsearchError) => executionStatusFromError(err, this.runDate)
      );

      // New consolidated statuses for lastRun
      const { metrics: executionMetrics } = map<RuleRunMetrics, ElasticsearchError, ILastRun>(
        runMetrics,
        (metrics) => lastRunFromState(metrics, this.ruleResult),
        (err: ElasticsearchError) => lastRunFromError(err)
      );

      // set start and duration based on event log
      const { start, duration } = this.alertingEventLogger.getStartAndDuration();
      if (null != start) {
        executionStatus.lastExecutionDate = start;
      }
      if (null != duration) {
        executionStatus.lastDuration = nanosToMillis(duration);
      }

      // if executionStatus indicates an error, fill in fields in
      this.ruleMonitoring.addHistory({
        duration: executionStatus.lastDuration,
        hasError: executionStatus.error != null,
        runDate: this.runDate,
      });

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

  private async scheduleNewOrDeleteTask() {
    const adHocRuleRunParams: AdHocRuleRunParams = this.adHocRuleRunData!.data!.indirectParams;

    // If no intervalEnd is specified, this is a one time ad hoc rule run
    // Delete the ad hoc rule run param SO
    if (!adHocRuleRunParams.end) {
      this.logger.info(`No intervalEnd specified - one time run`);
      this.shouldDeleteTask = true;
    } else {
      // If the current start + interval > end, we've finished the execution set
      const newStart = new Date(
        new Date(adHocRuleRunParams.currentStart).valueOf() +
          parseDuration(adHocRuleRunParams.duration)
      );
      const endAsMillis = new Date(adHocRuleRunParams.end).valueOf();
      if (newStart.valueOf() > endAsMillis) {
        this.logger.info(`Completed ad hoc execution sequence`);
        this.shouldDeleteTask = true;
      } else {
        this.logger.info(
          `Updating ad hoc rule run param SO with new start ${newStart.toISOString()}`
        );
        // Update the SO with the new start time
        await this.internalSavedObjectsRepository.update<AdHocRuleRunParams>(
          'backfill_params',
          this.taskInstance.params.adHocRuleRunParamsId,
          { currentStart: newStart.toISOString() },
          { refresh: false }
        );
      }
    }
  }
}
