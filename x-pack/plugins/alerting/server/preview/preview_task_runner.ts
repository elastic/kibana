/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, Logger } from '@kbn/core/server';
import { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { ExecutionHandler, RunResult } from '../task_runner/execution_handler';
import { TaskRunnerContext } from './preview_task_runner_factory';
import { ErrorWithReason } from '../lib';
import { RuleExecutionStatusErrorReasons, RuleTypeRegistry } from '../types';
import { createWrappedScopedClusterClientFactory } from '../lib/wrap_scoped_cluster_client';
import { wrapSearchSourceClient } from '../lib/wrap_search_source_client';
import { getFakeKibanaRequest } from '../task_runner/rule_loader';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface RunRuleParams {
  executionUuid: string;
  fakeRequest: KibanaRequest;
  rule: any;
}

export class PreviewTaskRunner {
  private context: TaskRunnerContext;
  private logger: Logger;
  private taskInstance: ConcreteTaskInstance;
  private readonly ruleTypeRegistry: RuleTypeRegistry;
  private readonly maxAlerts: number;
  private searchAbortController: AbortController;
  private cancelled: boolean;

  constructor(taskInstance: ConcreteTaskInstance, context: TaskRunnerContext) {
    this.context = context;
    this.logger = context.logger.get(`alerting-preview`);
    this.taskInstance = taskInstance;
    this.ruleTypeRegistry = context.ruleTypeRegistry;
    this.searchAbortController = new AbortController();
    this.cancelled = false;
    this.maxAlerts = context.maxAlerts;
  }

  private getAADRuleData(rule: any, ruleId: string, executionUuid: string, spaceId: string) {
    return {
      id: ruleId,
      name: rule.name,
      tags: rule.tags,
      consumer: rule.consumer,
      spaceId,
      executionId: executionUuid,
      parameters: rule.params,
    };
  }

  private async runRule({ executionUuid, fakeRequest, rule }: RunRuleParams): Promise<void> {
    const {
      actions,
      alertTypeId: ruleTypeId,
      consumer,
      enabled,
      id: ruleId,
      name,
      params,
      schedule,
      spaceId,
      tags,
    } = rule;
    const ruleType = this.ruleTypeRegistry.get(ruleTypeId);
    const ruleLabel = `${ruleType.id}:${executionUuid}: '${name}'`;

    const wrappedClientOptions = {
      rule: {
        name: rule.name,
        alertTypeId: rule.alertTypeId,
        id: executionUuid,
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

    const alertsClient = await this.context.alertsService?.createPreviewAlertsClient({
      logger: this.logger,
    });

    alertsClient!.initializeExecution({
      maxAlerts: this.maxAlerts,
      ruleType,
      ruleLabel,
      activeAlertsFromState: {},
      recoveredAlertsFromState: {},
      maintenanceWindowIds: [],
      rule: this.getAADRuleData(rule, ruleId, executionUuid, spaceId),
    });

    const checkHasReachedAlertLimit = () => {
      const reachedLimit = alertsClient!.hasReachedAlertLimit();
      if (reachedLimit) {
        this.logger.warn(
          `rule preview execution generated greater than ${this.maxAlerts} alerts: ${ruleLabel}`
        );
      }
      return reachedLimit;
    };
    try {
      const savedObjectsClient = this.context.savedObjects.getScopedClient(fakeRequest, {
        includedHiddenTypes: ['alert', 'action'],
      });
      const dataViews = await this.context.dataViews.dataViewsServiceFactory(
        savedObjectsClient,
        scopedClusterClient.asInternalUser
      );
      await ruleType.executor({
        executionId: executionUuid,
        services: {
          savedObjectsClient,
          searchSourceClient: wrappedSearchSourceClient.searchSourceClient,
          uiSettingsClient: this.context.uiSettings.asScopedToClient(savedObjectsClient),
          scopedClusterClient: wrappedScopedClusterClient.client(),
          alertFactory: alertsClient!.getExecutorServices(),
          shouldWriteAlerts: () => false,
          shouldStopExecution: () => this.cancelled,
          dataViews,
          share: this.context.share,
        },
        params,
        state: {},
        startedAt: this.taskInstance.startedAt!,
        previousStartedAt: null,
        spaceId,
        namespace: this.context.spaceIdToNamespace(spaceId),
        rule: {
          id: ruleId,
          name,
          tags,
          consumer,
          producer: ruleType.producer,
          revision: 0,
          ruleTypeId: rule.alertTypeId,
          ruleTypeName: ruleType.name,
          enabled,
          schedule,
          actions,
          createdBy: `preview`,
          updatedBy: `preview`,
          createdAt: new Date(),
          updatedAt: new Date(),
          throttle: null,
          notifyWhen: null,
          muteAll: false,
        },
        logger: this.logger,
      });

      // Rule type preview execution has successfully completed
      // Check that the rule type either never requested the max alerts limit
      // or requested it and then reported back whether it exceeded the limit
      // If neither of these apply, this check will throw an error
      // These errors should show up during rule type development
      alertsClient!.checkLimitUsage();
    } catch (err) {
      // Check if this error is due to reaching the alert limit
      if (!checkHasReachedAlertLimit()) {
        throw new ErrorWithReason(RuleExecutionStatusErrorReasons.Execute, err);
      }
    }
    // Check if the rule type has reported that it reached the alert limit
    checkHasReachedAlertLimit();

    await alertsClient!.processAndLogAlerts({ shouldLogAlerts: false });
    // const executionHandler = new ExecutionHandler({
    //   rule,
    //   ruleType: this.ruleType,
    //   logger: this.logger,
    //   taskRunnerContext: this.context,
    //   taskInstance: this.taskInstance,
    //   ruleRunMetricsStore,
    //   apiKey,
    //   ruleConsumer: this.ruleConsumer!,
    //   executionId: this.executionId,
    //   ruleLabel,
    //   previousStartedAt: previousStartedAt ? new Date(previousStartedAt) : null,
    //   alertingEventLogger: this.alertingEventLogger,
    //   actionsClient: await this.context.actionsPlugin.getActionsClientWithRequest(fakeRequest),
    //   maintenanceWindowIds,
    // });
    // let executionHandlerRunResult: RunResult = { throttledSummaryActions: {} };
    // await this.timer.runWithTimer(TaskRunnerTimerSpan.TriggerActions, async () => {
    //   await rulesClient.clearExpiredSnoozes({ id: rule.id });
    //   if (isRuleSnoozed(rule)) {
    //     this.logger.debug(`no scheduling of actions for rule ${ruleLabel}: rule is snoozed.`);
    //   } else if (!this.shouldLogAndScheduleActionsForAlerts()) {
    //     this.logger.debug(
    //       `no scheduling of actions for rule ${ruleLabel}: rule execution has been cancelled.`
    //     );
    //     this.countUsageOfActionExecutionAfterRuleCancellation();
    //   } else {
    //     executionHandlerRunResult = await executionHandler.run({
    //       ...this.legacyAlertsClient.getProcessedAlerts('activeCurrent'),
    //       ...this.legacyAlertsClient.getProcessedAlerts('recoveredCurrent'),
    //     });
    //   }
    // });

    await alertsClient!.getAlertsToSerialize();
  }

  async run() {
    console.log(`taskInstance ${JSON.stringify(this.taskInstance)}`);
    const {
      params: { executionUuid, rule },
    } = this.taskInstance;
    const runDate = new Date();
    this.logger.info(`previewing rule ${rule.alertTypeId}:${rule.id} at ${runDate.toISOString()}`);

    // Generate fake request with API key
    const fakeRequest = getFakeKibanaRequest(this.context, rule.spaceId, rule.apiKey);
    try {
      await this.runRule({ fakeRequest, executionUuid, rule });
    } catch (err) {}
    //   let nextRun: string | null = null;
    //   if (isOk(schedule)) {
    //     nextRun = getNextRun({ startDate: startedAt, interval: schedule.value.interval });
    //   } else if (taskSchedule) {
    //     nextRun = getNextRun({ startDate: startedAt, interval: taskSchedule.interval });
    //   }
    //   const { executionStatus, executionMetrics } = await this.timer.runWithTimer(
    //     TaskRunnerTimerSpan.ProcessRuleRun,
    //     async () =>
    //       this.processRunResults({
    //         nextRun,
    //         runDate,
    //         stateWithMetrics,
    //       })
    //   );
    //   const transformRunStateToTaskState = (
    //     runStateWithMetrics: RuleTaskStateAndMetrics
    //   ): RuleTaskState => {
    //     return {
    //       ...omit(runStateWithMetrics, ['metrics']),
    //       previousStartedAt: startedAt,
    //     };
    //   };
    //   if (startedAt) {
    //     // Capture how long it took for the rule to run after being claimed
    //     this.timer.setDuration(TaskRunnerTimerSpan.TotalRunDuration, startedAt);
    //   }
    //   this.alertingEventLogger.done({
    //     status: executionStatus,
    //     metrics: executionMetrics,
    //     timings: this.timer.toJson(),
    //   });
  }

  async cancel(): Promise<void> {
    if (this.cancelled) {
      return;
    }

    this.cancelled = true;

    //   // Write event log entry
    //   const {
    //     params: { alertId: ruleId, spaceId, consumer },
    //     schedule: taskSchedule,
    //     startedAt,
    //   } = this.taskInstance;
    //   const namespace = this.context.spaceIdToNamespace(spaceId);

    //   if (consumer && !this.ruleConsumer) {
    //     this.ruleConsumer = consumer;
    //   }

    //   this.logger.debug(
    //     `Cancelling rule type ${this.ruleType.id} with id ${ruleId} - execution exceeded rule type timeout of ${this.ruleType.ruleTaskTimeout}`
    //   );

    //   this.logger.debug(
    //     `Aborting any in-progress ES searches for rule type ${this.ruleType.id} with id ${ruleId}`
    //   );
    //   this.searchAbortController.abort();

    //   this.alertingEventLogger.logTimeout();

    //   this.inMemoryMetrics.increment(IN_MEMORY_METRICS.RULE_TIMEOUTS);

    //   let nextRun: string | null = null;
    //   if (taskSchedule) {
    //     nextRun = getNextRun({ startDate: startedAt, interval: taskSchedule.interval });
    //   }

    //   const outcomeMsg = [
    //     `${this.ruleType.id}:${ruleId}: execution cancelled due to timeout - exceeded rule type timeout of ${this.ruleType.ruleTaskTimeout}`,
    //   ];
    //   const date = new Date();
    //   // Update the rule saved object with execution status
    //   const executionStatus: RuleExecutionStatus = {
    //     lastExecutionDate: date,
    //     status: 'error',
    //     error: {
    //       reason: RuleExecutionStatusErrorReasons.Timeout,
    //       message: outcomeMsg.join(' '),
    //     },
    //   };
    //   this.logger.debug(
    //     `Updating rule task for ${this.ruleType.id} rule with id ${ruleId} - execution error due to timeout`
    //   );
    //   const outcome = 'failed';
    //   await this.updateRuleSavedObjectPostRun(ruleId, namespace, {
    //     executionStatus: ruleExecutionStatusToRaw(executionStatus),
    //     lastRun: {
    //       outcome,
    //       outcomeOrder: RuleLastRunOutcomeOrderMap[outcome],
    //       warning: RuleExecutionStatusErrorReasons.Timeout,
    //       outcomeMsg,
    //       alertsCount: {},
    //     },
    //     monitoring: this.ruleMonitoring.getMonitoring() as RawRuleMonitoring,
    //     nextRun: nextRun && new Date(nextRun).getTime() > date.getTime() ? nextRun : null,
    //   });
  }
}
