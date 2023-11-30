/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, Logger } from '@kbn/core/server';
import { AlertInstanceContext, AlertInstanceState, RuleTaskState } from '@kbn/alerting-state-types';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { some } from 'lodash';
import {
  RuleAlertData,
  RuleExecutionStatusErrorReasons,
  RuleNotifyWhen,
  RuleTypeParams,
  RuleTypeState,
  SanitizedRuleConfig,
} from '../types';
import { TaskRunnerContext } from './types';
import { RuleRunMetricsStore } from '../lib/rule_run_metrics_store';
import { TaskRunnerTimer, TaskRunnerTimerSpan } from './task_runner_timer';
import { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';
import { getTimeRange } from '../lib/get_time_range';
import { ExecutorServices } from './get_executor_services';
import { ElasticsearchError, ErrorWithReason } from '../lib';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import { IAlertsClient } from '../alerts_client/types';
import { LegacyAlertsClient } from '../alerts_client';

interface ConstructorOpts {
  context: TaskRunnerContext;
  timer: TaskRunnerTimer;
  logger: Logger;
  runCancelled: () => boolean;
}

interface RunOpts {
  alertingEventLogger: AlertingEventLogger;
  executionId: string;
  executorServices: ExecutorServices & {
    getTimeRangeFn?: (timeWindow: string) => { dateStart: string; dateEnd: string };
  };
  fakeRequest: KibanaRequest;
  maintenanceWindowIds?: string[];
  rule: SanitizedRuleConfig;
  ruleId: string;
  ruleLabel: string;
  ruleRunMetricsStore: RuleRunMetricsStore;
  spaceId: string;
  startedAt: Date | null;
  state: RuleTaskState;
  validatedParams: RuleTypeParams;
}

interface StackTraceLog {
  message: ElasticsearchError;
  stackTrace?: string;
}

export class RuleRunner<
  AlertData extends RuleAlertData,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  private ruleRunErrorStack: StackTraceLog | null = null;
  private client?: IAlertsClient<AlertData, State, Context, ActionGroupIds, RecoveryActionGroupId>;

  constructor(private readonly options: ConstructorOpts) {}

  public get runError() {
    return this.ruleRunErrorStack;
  }

  public get alertsClient(): IAlertsClient<
    AlertData,
    State,
    Context,
    ActionGroupIds,
    RecoveryActionGroupId
  > {
    return this.client!;
  }

  public async run(opts: RunOpts) {
    const {
      alertingEventLogger,
      executionId,
      executorServices,
      fakeRequest,
      rule,
      ruleId,
      ruleLabel,
      ruleRunMetricsStore,
      spaceId,
      startedAt,
      state,
      validatedParams,
    } = opts;

    const {
      alertInstances: alertRawInstances = {},
      alertRecoveredInstances: alertRecoveredRawInstances = {},
      alertTypeState: ruleTypeState = {},
      previousStartedAt,
    } = state;

    const rulesSettingsClient = this.options.context.getRulesSettingsClientWithRequest(fakeRequest);
    const namespace = this.options.context.spaceIdToNamespace(spaceId) ?? DEFAULT_NAMESPACE_STRING;
    const ruleType = this.options.context.ruleTypeRegistry.get(rule.ruleTypeId);

    const flappingSettings = await rulesSettingsClient.flapping().get();
    const queryDelaySettings = await rulesSettingsClient.queryDelay().get();
    const alertsClientParams = { logger: this.options.logger, ruleType };

    try {
      const client =
        (await this.options.context.alertsService?.createAlertsClient<
          AlertData,
          State,
          Context,
          ActionGroupIds,
          RecoveryActionGroupId
        >({
          ...alertsClientParams,
          namespace: namespace ?? DEFAULT_NAMESPACE_STRING,
          rule: this.getAADRuleData(
            rule.id,
            opts.executionId,
            {
              consumer: rule.consumer,
              name: rule.name,
              params: validatedParams,
              revision: rule.revision,
              tags: rule.tags,
            },
            spaceId
          ),
        })) ?? null;

      this.client = client
        ? client
        : new LegacyAlertsClient<State, Context, ActionGroupIds, RecoveryActionGroupId>(
            alertsClientParams
          );
    } catch (err) {
      this.options.logger.error(
        `Error initializing AlertsClient for context ${ruleType.alerts?.context}. Using legacy alerts client instead. - ${err.message}`
      );

      this.client = new LegacyAlertsClient<State, Context, ActionGroupIds, RecoveryActionGroupId>(
        alertsClientParams
      );
    }

    await this.alertsClient.initializeExecution({
      maxAlerts: this.options.context.maxAlerts,
      ruleLabel,
      flappingSettings,
      startedAt: startedAt!,
      activeAlertsFromState: alertRawInstances,
      recoveredAlertsFromState: alertRecoveredRawInstances,
    });

    const { updatedRuleTypeState } = await this.options.timer.runWithTimer(
      TaskRunnerTimerSpan.RuleTypeRun,
      async () => {
        const checkHasReachedAlertLimit = () => {
          const reachedLimit = this.alertsClient.hasReachedAlertLimit() || false;
          if (reachedLimit) {
            this.options.logger.warn(
              `rule execution generated greater than ${this.options.context.maxAlerts} alerts: ${ruleLabel}`
            );
            ruleRunMetricsStore.setHasReachedAlertLimit(true);
          }
          return reachedLimit;
        };

        let executorResult: { state: RuleTypeState } | undefined;
        try {
          const ctx = {
            type: 'alert',
            name: `execute ${rule.ruleTypeId}`,
            id: ruleId,
            description: `execute [${rule.ruleTypeId}] with name [${rule.name}] in [${namespace}] namespace`,
          };

          executorResult = await this.options.context.executionContext.withContext(ctx, () =>
            ruleType.executor({
              executionId,
              services: {
                dataViews: executorServices.dataViews,
                savedObjectsClient: executorServices.savedObjectsClient,
                uiSettingsClient: executorServices.uiSettingsClient,
                scopedClusterClient: executorServices.wrappedScopedClusterClient.client(),
                searchSourceClient: executorServices.wrappedSearchSourceClient.searchSourceClient,
                alertFactory: this.alertsClient.factory(),
                alertsClient: this.alertsClient.client(),
                shouldWriteAlerts: () => this.shouldLogAndScheduleActionsForAlerts(ruleType),
                shouldStopExecution: () => this.options.runCancelled(),
                ruleMonitoringService: executorServices.publicRuleMonitoringService,
                share: this.options.context.share,
                ruleResultService: executorServices.publicRuleResultService,
              },
              params: validatedParams,
              state: ruleTypeState,
              startedAt: startedAt!,
              previousStartedAt: previousStartedAt ? new Date(previousStartedAt) : null,
              spaceId,
              namespace,
              rule,
              logger: this.options.logger,
              flappingSettings,
              getTimeRange:
                executorServices.getTimeRangeFn ??
                ((timeWindow: string, nowDate?: string) =>
                  getTimeRange({
                    logger: this.options.logger,
                    queryDelaySettings,
                    window: timeWindow,
                    nowDate,
                  })),
            })
          );

          // Rule type execution has successfully completed
          // Check that the rule type either never requested the max alerts limit
          // or requested it and then reported back whether it exceeded the limit
          // If neither of these apply, this check will throw an error
          // These errors should show up during rule type development
          this.alertsClient.checkLimitUsage();
        } catch (err) {
          // Check if this error is due to reaching the alert limit
          if (!checkHasReachedAlertLimit()) {
            alertingEventLogger.setExecutionFailed(
              `rule execution failure: ${ruleLabel}`,
              err.message
            );
            this.ruleRunErrorStack = { message: err, stackTrace: err.stack };
            throw new ErrorWithReason(RuleExecutionStatusErrorReasons.Execute, err);
          }
        }

        // Check if the rule type has reported that it reached the alert limit
        checkHasReachedAlertLimit();

        alertingEventLogger.setExecutionSucceeded(`rule executed: ${ruleLabel}`);
        ruleRunMetricsStore.setSearchMetrics([
          executorServices.wrappedScopedClusterClient.getMetrics(),
          executorServices.wrappedSearchSourceClient.getMetrics(),
        ]);

        return {
          updatedRuleTypeState: executorResult?.state || undefined,
        };
      }
    );

    await this.options.timer.runWithTimer(TaskRunnerTimerSpan.ProcessAlerts, async () => {
      this.alertsClient.processAndLogAlerts({
        eventLogger: alertingEventLogger,
        ruleRunMetricsStore,
        shouldLogAlerts: this.shouldLogAndScheduleActionsForAlerts(ruleType),
        flappingSettings,
        notifyOnActionGroupChange:
          rule.notifyWhen === RuleNotifyWhen.CHANGE ||
          some(rule.actions, (action) => action.frequency?.notifyWhen === RuleNotifyWhen.CHANGE),
        maintenanceWindowIds: opts.maintenanceWindowIds ?? [],
      });
    });

    await this.options.timer.runWithTimer(TaskRunnerTimerSpan.PersistAlerts, async () => {
      await this.alertsClient.persistAlerts();
    });

    return updatedRuleTypeState;
  }

  private getAADRuleData(
    ruleId: string,
    executionId: string,
    ruleData: { consumer: string; name: string; params: unknown; revision: number; tags: string[] },
    spaceId: string
  ) {
    return {
      consumer: ruleData.consumer,
      executionId,
      id: ruleId,
      name: ruleData.name,
      parameters: ruleData.params,
      revision: ruleData.revision,
      spaceId,
      tags: ruleData.tags,
    };
  }

  private shouldLogAndScheduleActionsForAlerts(ruleType: UntypedNormalizedRuleType) {
    // if execution hasn't been cancelled, return true
    if (!this.options.runCancelled()) {
      return true;
    }

    // if execution has been cancelled, return true if EITHER alerting config or rule type indicate to proceed with scheduling actions
    return !this.options.context.cancelAlertsOnRuleTimeout || !ruleType.cancelAlertsOnRuleTimeout;
  }
}
