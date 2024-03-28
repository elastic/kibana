/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertInstanceContext, AlertInstanceState, RuleTaskState } from '@kbn/alerting-state-types';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { Logger } from '@kbn/core/server';
import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server';
import { some } from 'lodash';
import { IAlertsClient } from '../alerts_client/types';
import { MaintenanceWindow } from '../application/maintenance_window/types';
import { ErrorWithReason } from '../lib';
import { getTimeRange } from '../lib/get_time_range';
import { NormalizedRuleType } from '../rule_type_registry';
import {
  RuleAlertData,
  RuleExecutionStatusErrorReasons,
  RuleNotifyWhen,
  RuleTypeParams,
  RuleTypeState,
  SanitizedRule,
} from '../types';
import { ExecutorServices } from './get_executor_services';
import { StackTraceLog } from './task_runner';
import { TaskRunnerTimer, TaskRunnerTimerSpan } from './task_runner_timer';
import { RuleTypeRunnerContext, TaskRunnerContext } from './types';

interface ConstructorOpts<
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams,
  RuleState extends RuleTypeState,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string,
  AlertData extends RuleAlertData
> {
  context: TaskRunnerContext;
  timer: TaskRunnerTimer;
  logger: Logger;
  ruleType: NormalizedRuleType<
    Params,
    ExtractedParams,
    RuleState,
    State,
    Context,
    ActionGroupIds,
    RecoveryActionGroupId,
    AlertData
  >;
}

interface RunOpts<
  Params extends RuleTypeParams,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string,
  AlertData extends RuleAlertData
> {
  context: RuleTypeRunnerContext;
  alertsClient: IAlertsClient<AlertData, State, Context, ActionGroupIds, RecoveryActionGroupId>;
  executionId: string;
  executorServices: ExecutorServices & {
    getTimeRangeFn?: (
      timeWindow: string,
      nowDate?: string
    ) => { dateStart: string; dateEnd: string };
  };
  maintenanceWindows?: MaintenanceWindow[];
  maintenanceWindowsWithoutScopedQueryIds?: string[];
  rule: SanitizedRule<Params>;
  startedAt: Date | null;
  state: RuleTaskState;
  validatedParams: Params;
}

interface RunResult {
  state: RuleTypeState | undefined;
  error?: Error;
  stackTrace?: StackTraceLog | null;
}

export class RuleTypeRunner<
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams,
  RuleState extends RuleTypeState,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string,
  AlertData extends RuleAlertData
> {
  private cancelled: boolean = false;

  constructor(
    private readonly options: ConstructorOpts<
      Params,
      ExtractedParams,
      RuleState,
      State,
      Context,
      ActionGroupIds,
      RecoveryActionGroupId,
      AlertData
    >
  ) {}

  public cancelRun() {
    this.cancelled = true;
  }

  public async run({
    context,
    alertsClient,
    executionId,
    executorServices,
    maintenanceWindows = [],
    maintenanceWindowsWithoutScopedQueryIds = [],
    rule,
    startedAt,
    state,
    validatedParams,
  }: RunOpts<
    Params,
    State,
    Context,
    ActionGroupIds,
    RecoveryActionGroupId,
    AlertData
  >): Promise<RunResult> {
    const {
      alertTypeId: ruleTypeId,
      consumer,
      schedule,
      throttle = null,
      notifyWhen = null,
      name,
      tags,
      createdBy,
      updatedBy,
      createdAt,
      updatedAt,
      enabled,
      actions,
      muteAll,
      revision,
      snoozeSchedule,
      alertDelay,
    } = rule;

    const { alertTypeState: ruleTypeState = {}, previousStartedAt } = state;

    const { updatedRuleTypeState, error, stackTrace } = await this.options.timer.runWithTimer(
      TaskRunnerTimerSpan.RuleTypeRun,
      async () => {
        const checkHasReachedAlertLimit = () => {
          const reachedLimit = alertsClient.hasReachedAlertLimit() || false;
          if (reachedLimit) {
            this.options.logger.warn(
              `rule execution generated greater than ${this.options.context.maxAlerts} alerts: ${context.ruleLogPrefix}`
            );
            context.ruleRunMetricsStore.setHasReachedAlertLimit(true);
          }
          return reachedLimit;
        };

        let executorResult: { state: RuleState } | undefined;
        try {
          const ctx = {
            type: 'alert',
            name: `execute ${ruleTypeId}`,
            id: context.ruleId,
            description: `execute [${ruleTypeId}] with name [${name}] in [${
              context.namespace ?? DEFAULT_NAMESPACE_STRING
            }] namespace`,
          };
          executorResult = await this.options.context.executionContext.withContext(ctx, () =>
            this.options.ruleType.executor({
              executionId,
              services: {
                alertFactory: alertsClient.factory(),
                alertsClient: alertsClient.client(),
                dataViews: executorServices.dataViews,
                ruleMonitoringService: executorServices.ruleMonitoringService,
                ruleResultService: executorServices.ruleResultService,
                savedObjectsClient: executorServices.savedObjectsClient,
                scopedClusterClient: executorServices.wrappedScopedClusterClient.client(),
                searchSourceClient: executorServices.wrappedSearchSourceClient.searchSourceClient,
                share: this.options.context.share,
                shouldStopExecution: () => this.cancelled,
                shouldWriteAlerts: () => this.shouldLogAndScheduleActionsForAlerts(),
                uiSettingsClient: executorServices.uiSettingsClient,
              },
              params: validatedParams,
              state: ruleTypeState as RuleState,
              startedAt: startedAt!,
              previousStartedAt: previousStartedAt ? new Date(previousStartedAt) : null,
              spaceId: context.spaceId,
              namespace: context.namespace,
              rule: {
                id: context.ruleId,
                name,
                tags,
                consumer,
                producer: this.options.ruleType.producer,
                revision,
                ruleTypeId,
                ruleTypeName: this.options.ruleType.name,
                enabled,
                schedule,
                actions,
                createdBy,
                updatedBy,
                createdAt,
                updatedAt,
                throttle,
                notifyWhen,
                muteAll,
                snoozeSchedule,
                alertDelay,
              },
              logger: this.options.logger,
              flappingSettings: context.flappingSettings,
              // passed in so the rule registry knows about maintenance windows
              ...(maintenanceWindowsWithoutScopedQueryIds.length
                ? { maintenanceWindowIds: maintenanceWindowsWithoutScopedQueryIds }
                : {}),
              getTimeRange: (timeWindow) =>
                getTimeRange(this.options.logger, context.queryDelaySettings, timeWindow),
            })
          );
          // Rule type execution has successfully completed
          // Check that the rule type either never requested the max alerts limit
          // or requested it and then reported back whether it exceeded the limit
          // If neither of these apply, this check will throw an error
          // These errors should show up during rule type development
          alertsClient.checkLimitUsage();
        } catch (err) {
          // Check if this error is due to reaching the alert limit
          if (!checkHasReachedAlertLimit()) {
            context.alertingEventLogger.setExecutionFailed(
              `rule execution failure: ${context.ruleLogPrefix}`,
              err.message
            );
            return {
              error: createTaskRunError(
                new ErrorWithReason(RuleExecutionStatusErrorReasons.Execute, err),
                TaskErrorSource.USER
              ),
              stackTrace: { message: err, stackTrace: err.stack },
            };
          }
        }

        // Check if the rule type has reported that it reached the alert limit
        checkHasReachedAlertLimit();

        context.alertingEventLogger.setExecutionSucceeded(
          `rule executed: ${context.ruleLogPrefix}`
        );
        context.ruleRunMetricsStore.setSearchMetrics([
          executorServices.wrappedScopedClusterClient.getMetrics(),
          executorServices.wrappedSearchSourceClient.getMetrics(),
        ]);

        return {
          updatedRuleTypeState: executorResult?.state || undefined,
        };
      }
    );

    if (error) {
      return { state: undefined, error, stackTrace };
    }

    await this.options.timer.runWithTimer(TaskRunnerTimerSpan.ProcessAlerts, async () => {
      alertsClient.processAlerts({
        flappingSettings: context.flappingSettings,
        notifyOnActionGroupChange:
          notifyWhen === RuleNotifyWhen.CHANGE ||
          some(actions, (action) => action.frequency?.notifyWhen === RuleNotifyWhen.CHANGE),
        maintenanceWindowIds: maintenanceWindowsWithoutScopedQueryIds,
        alertDelay: alertDelay?.active ?? 0,
        ruleRunMetricsStore: context.ruleRunMetricsStore,
      });
    });

    await this.options.timer.runWithTimer(TaskRunnerTimerSpan.PersistAlerts, async () => {
      const updateAlertsMaintenanceWindowResult = await alertsClient.persistAlerts(
        maintenanceWindows
      );

      // Set the event log MW ids again, this time including the ids that matched alerts with
      // scoped query
      if (updateAlertsMaintenanceWindowResult?.maintenanceWindowIds) {
        context.alertingEventLogger.setMaintenanceWindowIds(
          updateAlertsMaintenanceWindowResult.maintenanceWindowIds
        );
      }
    });

    alertsClient.logAlerts({
      eventLogger: context.alertingEventLogger,
      ruleRunMetricsStore: context.ruleRunMetricsStore,
      shouldLogAlerts: this.shouldLogAndScheduleActionsForAlerts(),
    });

    return { state: updatedRuleTypeState };
  }

  private shouldLogAndScheduleActionsForAlerts() {
    // if execution hasn't been cancelled, return true
    if (!this.cancelled) {
      return true;
    }

    // if execution has been cancelled, return true if EITHER alerting config or rule type indicate to proceed with scheduling actions
    return (
      !this.options.context.cancelAlertsOnRuleTimeout ||
      !this.options.ruleType.cancelAlertsOnRuleTimeout
    );
  }
}
