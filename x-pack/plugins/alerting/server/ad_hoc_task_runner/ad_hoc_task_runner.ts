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
import { ErrorWithReason, validateRuleTypeParams } from '../lib';
import { RuleRunMetricsStore } from '../lib/rule_run_metrics_store';
import { IAlertsClient, UntypedAlertsClient } from '../alerts_client/types';
import { LegacyAlertsClient } from '../alerts_client';
import { RuleRunner } from '../task_runner/rule_runner';
import { RuleMonitoringService } from '../monitoring/rule_monitoring_service';
import { RuleResultService } from '../monitoring/rule_result_service';
import { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';
import { getExecutorServices } from '../task_runner/get_executor_services';
import { getTimeRange } from '../lib/get_time_range';

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
  private searchAbortController: AbortController;
  private cancelled: boolean;
  private ruleMonitoring: RuleMonitoringService;
  private ruleResult: RuleResultService;
  private ruleRunner: RuleRunner;
  private shouldDeleteTask: boolean = false;
  private adHocRuleRunData?: AdHocRuleRunParamResult<AdHocRuleRunData>;

  constructor({ context, internalSavedObjectsRepository, taskInstance }: ConstructorOpts) {
    this.context = context;
    this.logger = context.logger.get();
    this.taskInstance = taskInstance;
    this.ruleTypeRegistry = context.ruleTypeRegistry;
    this.internalSavedObjectsRepository = internalSavedObjectsRepository;
    this.alertingEventLogger = new AlertingEventLogger(this.context.eventLogger);
    this.searchAbortController = new AbortController();
    this.cancelled = false;
    this.executionId = uuidv4();
    this.ruleMonitoring = new RuleMonitoringService();
    this.ruleResult = new RuleResultService();
    this.ruleRunner = new RuleRunner({
      context: this.context,
      logger: this.logger,
      runCancelled: () => this.cancelled,
    });
  }

  private getAADRuleData(ruleId: string, rule: AdHocRuleRunParams['rule'], spaceId: string) {
    return {
      consumer: rule.consumer,
      executionId: this.executionId,
      id: ruleId,
      name: rule.name,
      parameters: rule.params,
      revision: rule.revision,
      spaceId,
      tags: rule.tags,
    };
  }

  private async runRule({
    fakeRequest,
    ruleRunParams,
    validatedParams: params,
  }: RunRuleParams): Promise<void> {
    const { rule, duration, currentStart, end } = ruleRunParams;
    const {
      params: { ruleId, spaceId },
    } = this.taskInstance;

    this.logger.info(`taskInstance: ${JSON.stringify(this.taskInstance)}`);

    const namespace = this.context.spaceIdToNamespace(spaceId) ?? DEFAULT_NAMESPACE_STRING;
    const ruleType = this.ruleTypeRegistry.get(rule.alertTypeId);
    const ruleLabel = `${ruleType.id}:${ruleId}: '${rule.name}'`;
    const ruleRunMetricsStore = new RuleRunMetricsStore();
    const alertsClientParams = { logger: this.logger, ruleType };

    this.alertingEventLogger.initialize({
      ruleId,
      ruleType,
      consumer: rule.consumer,
      spaceId,
      executionId: this.executionId,
      taskScheduledAt: this.taskInstance.scheduledAt,
      ...(namespace ? { namespace } : {}),
    });

    this.alertingEventLogger.start(this.runDate);

    // Create AlertsClient if rule type has registered an alerts context
    // with the framework. The AlertsClient will handle reading and
    // writing from alerts-as-data indices and eventually
    // we will want to migrate all the processing of alerts out
    // of the LegacyAlertsClient and into the AlertsClient.
    let alertsClient: IAlertsClient<
      RuleAlertData,
      AlertInstanceState,
      AlertInstanceContext,
      string,
      string
    >;

    try {
      const client =
        (await this.context.alertsService?.createAlertsClient<
          RuleAlertData,
          AlertInstanceState,
          AlertInstanceContext,
          string,
          string
        >({
          ...alertsClientParams,
          namespace: namespace ?? DEFAULT_NAMESPACE_STRING,
          rule: this.getAADRuleData(ruleId, rule, spaceId),
        })) ?? null;

      alertsClient = client
        ? client
        : new LegacyAlertsClient<AlertInstanceState, AlertInstanceContext, string, string>(
            alertsClientParams
          );
    } catch (err) {
      this.logger.error(
        `Error initializing AlertsClient for context ${ruleType.alerts?.context}. Using legacy alerts client instead. - ${err.message}`
      );

      alertsClient = new LegacyAlertsClient<
        AlertInstanceState,
        AlertInstanceContext,
        string,
        string
      >(alertsClientParams);
    }

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
      alertsClient: alertsClient as unknown as UntypedAlertsClient,
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
      ruleId,
      ruleLabel,
      ruleRunMetricsStore,
      spaceId,
      startedAt: nowDate,
      state: {},
      validatedParams: params,
    });
  }

  public async loadIndirectParams(): Promise<AdHocRuleRunParamResult<AdHocRuleRunData>> {
    // Used by task manager to validate ad hoc params before running
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
      this.adHocRuleRunData = { data: { indirectParams: adHocRuleRunParams.attributes } };
    } catch (error) {
      this.adHocRuleRunData = { error };
    }
    return this.adHocRuleRunData;
  }

  public async run(): Promise<AdHocRuleTaskRunResult> {
    if (!this.adHocRuleRunData) {
      this.adHocRuleRunData = await this.loadIndirectParams();
    }
    if (this.adHocRuleRunData.error) {
      throw this.adHocRuleRunData.error;
    }

    const adHocRuleRunParams: AdHocRuleRunParams = this.adHocRuleRunData.data.indirectParams;

    // these are from validateRule
    try {
      this.ruleTypeRegistry.ensureRuleTypeEnabled(adHocRuleRunParams.rule.alertTypeId);
    } catch (err) {
      throw new ErrorWithReason(RuleExecutionStatusErrorReasons.License, err);
    }

    const ruleType = this.ruleTypeRegistry.get(adHocRuleRunParams.rule.alertTypeId);

    let validatedParams: RuleTypeParams;
    try {
      validatedParams = validateRuleTypeParams(
        adHocRuleRunParams.rule.params,
        ruleType.validate.params
      );
    } catch (err) {
      throw new ErrorWithReason(RuleExecutionStatusErrorReasons.Validate, err);
    }

    // Generate fake request with API key
    const fakeRequest = getFakeKibanaRequest(
      this.context,
      adHocRuleRunParams.spaceId,
      adHocRuleRunParams.apiKeyToUse
    );

    try {
      await this.runRule({ fakeRequest, ruleRunParams: adHocRuleRunParams, validatedParams });
    } catch (err) {
      this.logger.error(`Error running ad-hoc rule - ${err.message}`);
    }

    this.logger.info(`Finished running rule ad hoc`);
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

    return { state: {}, ...(this.shouldDeleteTask ? {} : { runAt: new Date() }) };

    // Other options
    // If we want to always use the latest changes to the rule, we could
    // just keep the rule ID in the task params and load the rule SO at
    // the beginning of ad hoc execution. This is less aligned with re-using
    // this for previews in the future.

    // Event log
    // We should write event log entries so we can keep a record of what
    // happened but if we use the "execute" event, it will show up in the
    // execution log table, but out of order. Maybe an "ad-hoc-execute" event?

    // Rule metrics
    // Don't update the rule SO with run metrics

    // Rules settings
    // Use the latest rules settings

    // try {
    //   const preparedResult = await this.prepareToRun();

    //   this.ruleMonitoring.setMonitoring(preparedResult.rule.monitoring);

    //   (async () => {
    //     try {
    //       await preparedResult.rulesClient.clearExpiredSnoozes({
    //         rule: preparedResult.rule,
    //         version: preparedResult.version,
    //       });
    //     } catch (e) {
    //       // Most likely a 409 conflict error, which is ok, we'll try again at the next rule run
    //       this.logger.debug(`Failed to clear expired snoozes: ${e.message}`);
    //     }
    //   })();

    //   stateWithMetrics = asOk(await this.runRule(preparedResult));

    //   // fetch the rule again to ensure we return the correct schedule as it may have
    //   // changed during the task execution
    //   const attributes = await getRuleAttributes<Params>(this.context, ruleId, spaceId);
    //   schedule = asOk(attributes.rule.schedule);
    // } catch (err) {
    //   stateWithMetrics = asErr(err);
    //   schedule = asErr(err);
    // }

    // let nextRun: string | null = null;
    // if (isOk(schedule)) {
    //   nextRun = getNextRun({ startDate: startedAt, interval: schedule.value.interval });
    // } else if (taskSchedule) {
    //   nextRun = getNextRun({ startDate: startedAt, interval: taskSchedule.interval });
    // }

    // const { executionStatus, executionMetrics } = await this.timer.runWithTimer(
    //   TaskRunnerTimerSpan.ProcessRuleRun,
    //   async () =>
    //     this.processRunResults({
    //       nextRun,
    //       stateWithMetrics,
    //     })
    // );

    // const transformRunStateToTaskState = (
    //   runStateWithMetrics: RuleTaskStateAndMetrics
    // ): RuleTaskState => {
    //   return {
    //     ...omit(runStateWithMetrics, ['metrics']),
    //     previousStartedAt: startedAt?.toISOString(),
    //   };
    // };

    // if (startedAt) {
    //   // Capture how long it took for the rule to run after being claimed
    //   this.timer.setDuration(TaskRunnerTimerSpan.TotalRunDuration, startedAt);
    // }

    // this.alertingEventLogger.done({
    //   status: executionStatus,
    //   metrics: executionMetrics,
    //   timings: this.timer.toJson(),
    // });

    // return {
    //   state: map<RuleTaskStateAndMetrics, ElasticsearchError, RuleTaskState>(
    //     stateWithMetrics,
    //     (ruleRunStateWithMetrics: RuleTaskStateAndMetrics) =>
    //       transformRunStateToTaskState(ruleRunStateWithMetrics),
    //     (err: ElasticsearchError) => {
    //       if (isAlertSavedObjectNotFoundError(err, ruleId)) {
    //         const message = `Executing Rule ${spaceId}:${
    //           this.ruleType.id
    //         }:${ruleId} has resulted in Error: ${getEsErrorMessage(err)}`;
    //         this.logger.debug(message);
    //       } else {
    //         const error = this.stackTraceLog ? this.stackTraceLog.message : err;
    //         const stack = this.stackTraceLog ? this.stackTraceLog.stackTrace : err.stack;
    //         const message = `Executing Rule ${spaceId}:${
    //           this.ruleType.id
    //         }:${ruleId} has resulted in Error: ${getEsErrorMessage(error)} - ${stack ?? ''}`;
    //         this.logger.error(message, {
    //           tags: [this.ruleType.id, ruleId, 'rule-run-failed'],
    //           error: { stack_trace: stack },
    //         });
    //       }
    //       return originalState;
    //     }
    //   ),
    //   schedule: resolveErr<IntervalSchedule | undefined, Error>(schedule, (error) => {
    //     if (isAlertSavedObjectNotFoundError(error, ruleId)) {
    //       const spaceMessage = spaceId ? `in the "${spaceId}" space ` : '';
    //       this.logger.warn(
    //         `Unable to execute rule "${ruleId}" ${spaceMessage}because ${error.message} - this rule will not be rescheduled. To restart rule execution, try disabling and re-enabling this rule.`
    //       );
    //       throwUnrecoverableError(error);
    //     }

    //     let retryInterval = taskSchedule?.interval ?? FALLBACK_RETRY_INTERVAL;

    //     // Set retry interval smaller for ES connectivity errors
    //     if (isEsUnavailableError(error, ruleId)) {
    //       retryInterval =
    //         parseDuration(retryInterval) > parseDuration(CONNECTIVITY_RETRY_INTERVAL)
    //           ? CONNECTIVITY_RETRY_INTERVAL
    //           : retryInterval;
    //     }

    //     return { interval: retryInterval };
    //   }),
    //   monitoring: this.ruleMonitoring.getMonitoring(),
    //   hasError: isErr(schedule),
    // };
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
}
