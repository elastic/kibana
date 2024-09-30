/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertInstanceContext, AlertInstanceState, RuleTaskState } from '@kbn/alerting-state-types';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { Logger } from '@kbn/core/server';
import {
  ConcreteTaskInstance,
  createTaskRunError,
  TaskErrorSource,
} from '@kbn/task-manager-plugin/server';
import { getErrorSource } from '@kbn/task-manager-plugin/server/task_running';
import { IAlertsClient } from '../alerts_client/types';
import { MaintenanceWindow } from '../application/maintenance_window/types';
import { ErrorWithReason } from '../lib';
import { getTimeRange } from '../lib/get_time_range';
import { NormalizedRuleType } from '../rule_type_registry';
import {
  DEFAULT_FLAPPING_SETTINGS,
  RuleAlertData,
  RuleExecutionStatusErrorReasons,
  RuleTypeParams,
  RuleTypeState,
  SanitizedRule,
} from '../types';
import { ExecutorServices } from './get_executor_services';
import { TaskRunnerTimer, TaskRunnerTimerSpan } from './task_runner_timer';
import { RuleRunnerErrorStackTraceLog, RuleTypeRunnerContext, TaskRunnerContext } from './types';
import { withAlertingSpan } from './lib';
import { WrappedSearchSourceClient } from '../lib/wrap_search_source_client';

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
  logger: Logger;
  task: ConcreteTaskInstance;
  timer: TaskRunnerTimer;
}

export type RuleData<Params extends RuleTypeParams> = Pick<
  SanitizedRule<Params>,
  | 'alertTypeId'
  | 'consumer'
  | 'schedule'
  | 'throttle'
  | 'notifyWhen'
  | 'name'
  | 'tags'
  | 'createdBy'
  | 'updatedBy'
  | 'createdAt'
  | 'updatedAt'
  | 'enabled'
  | 'actions'
  | 'muteAll'
  | 'revision'
  | 'snoozeSchedule'
  | 'alertDelay'
>;

interface RunOpts<
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams,
  RuleState extends RuleTypeState,
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
  rule: RuleData<Params>;
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
  startedAt: Date;
  state: RuleTaskState;
  validatedParams: Params;
}

interface RunResult {
  state: RuleTypeState | undefined;
  error?: Error;
  stackTrace?: RuleRunnerErrorStackTraceLog | null;
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
    ruleType,
    startedAt,
    state,
    validatedParams,
  }: RunOpts<
    Params,
    ExtractedParams,
    RuleState,
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

    const startedAtOverridden =
      this.options.task.startedAt?.toISOString() !== startedAt.toISOString();

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
        let wrappedSearchSourceClient: WrappedSearchSourceClient | undefined;
        try {
          const ctx = {
            type: 'alert',
            name: `execute ${ruleTypeId}`,
            id: context.ruleId,
            description: `execute [${ruleTypeId}] with name [${name}] in [${
              context.namespace ?? DEFAULT_NAMESPACE_STRING
            }] namespace`,
          };
          executorResult = await withAlertingSpan('rule-type-executor', () =>
            this.options.context.executionContext.withContext(ctx, () =>
              ruleType.executor({
                executionId,
                services: {
                  alertFactory: alertsClient.factory(),
                  alertsClient: alertsClient.client(),
                  ruleMonitoringService: executorServices.ruleMonitoringService,
                  ruleResultService: executorServices.ruleResultService,
                  savedObjectsClient: executorServices.savedObjectsClient,
                  scopedClusterClient: executorServices.wrappedScopedClusterClient.client(),
                  share: this.options.context.share,
                  shouldStopExecution: () => this.cancelled,
                  shouldWriteAlerts: () =>
                    this.shouldLogAndScheduleActionsForAlerts(ruleType.cancelAlertsOnRuleTimeout),
                  uiSettingsClient: executorServices.uiSettingsClient,
                  getDataViews: executorServices.getDataViews,
                  getSearchSourceClient: async () => {
                    if (!wrappedSearchSourceClient) {
                      wrappedSearchSourceClient =
                        await executorServices.getWrappedSearchSourceClient();
                    }
                    return wrappedSearchSourceClient.searchSourceClient;
                  },
                },
                params: validatedParams,
                state: ruleTypeState as RuleState,
                startedAtOverridden,
                startedAt,
                previousStartedAt: previousStartedAt ? new Date(previousStartedAt) : null,
                spaceId: context.spaceId,
                namespace: context.namespace,
                rule: {
                  id: context.ruleId,
                  name,
                  tags,
                  consumer,
                  producer: ruleType.producer,
                  revision,
                  ruleTypeId,
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
                  muteAll,
                  snoozeSchedule,
                  alertDelay,
                },
                logger: this.options.logger,
                flappingSettings: context.flappingSettings ?? DEFAULT_FLAPPING_SETTINGS,
                // passed in so the rule registry knows about maintenance windows
                ...(maintenanceWindowsWithoutScopedQueryIds.length
                  ? { maintenanceWindowIds: maintenanceWindowsWithoutScopedQueryIds }
                  : {}),
                getTimeRange: (timeWindow) =>
                  getTimeRange({
                    logger: this.options.logger,
                    window: timeWindow,
                    ...(context.queryDelaySec ? { queryDelay: context.queryDelaySec } : {}),
                    ...(startedAtOverridden ? { forceNow: startedAt } : {}),
                  }),
              })
            )
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
                getErrorSource(err) || TaskErrorSource.FRAMEWORK
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

        const metrics = [executorServices.wrappedScopedClusterClient.getMetrics()];
        if (wrappedSearchSourceClient) {
          metrics.push(wrappedSearchSourceClient.getMetrics());
        }
        context.ruleRunMetricsStore.setSearchMetrics(metrics);

        return {
          updatedRuleTypeState: executorResult?.state || undefined,
        };
      }
    );

    if (error) {
      return { state: undefined, error, stackTrace };
    }

    await withAlertingSpan('alerting:process-alerts', () =>
      this.options.timer.runWithTimer(TaskRunnerTimerSpan.ProcessAlerts, async () => {
        alertsClient.processAlerts({
          flappingSettings: context.flappingSettings ?? DEFAULT_FLAPPING_SETTINGS,
          maintenanceWindowIds: maintenanceWindowsWithoutScopedQueryIds,
          alertDelay: alertDelay?.active ?? 0,
          ruleRunMetricsStore: context.ruleRunMetricsStore,
        });
      })
    );

    await withAlertingSpan('alerting:index-alerts-as-data', () =>
      this.options.timer.runWithTimer(TaskRunnerTimerSpan.PersistAlerts, async () => {
        const updateAlertsMaintenanceWindowResult = await alertsClient.persistAlerts(
          maintenanceWindows
        );

        // Set the event log MW ids again, this time including the ids that matched alerts with
        // scoped query
        if (
          updateAlertsMaintenanceWindowResult?.maintenanceWindowIds &&
          updateAlertsMaintenanceWindowResult?.maintenanceWindowIds.length > 0
        ) {
          context.alertingEventLogger.setMaintenanceWindowIds(
            updateAlertsMaintenanceWindowResult.maintenanceWindowIds
          );
        }
      })
    );

    alertsClient.logAlerts({
      eventLogger: context.alertingEventLogger,
      ruleRunMetricsStore: context.ruleRunMetricsStore,
      shouldLogAlerts: this.shouldLogAndScheduleActionsForAlerts(
        ruleType.cancelAlertsOnRuleTimeout
      ),
    });

    return { state: updatedRuleTypeState };
  }

  private shouldLogAndScheduleActionsForAlerts(ruleTypeShouldCancel?: boolean) {
    // if execution hasn't been cancelled, return true
    if (!this.cancelled) {
      return true;
    }

    // if execution has been cancelled, return true if EITHER alerting config or rule type indicate to proceed with scheduling actions
    return !this.options.context.cancelAlertsOnRuleTimeout || !ruleTypeShouldCancel;
  }
}
