/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { Logger } from '@kbn/core/server';
import { getRuleDetailsRoute, triggersActionsRoute } from '@kbn/rule-data-utils';
import { asSavedObjectExecutionSource } from '@kbn/actions-plugin/server';
import { isEphemeralTaskRejectedDueToCapacityError } from '@kbn/task-manager-plugin/server';
import { ExecuteOptions as EnqueueExecutionOptions } from '@kbn/actions-plugin/server/create_execute_function';
import { ActionsCompletion } from '@kbn/alerting-state-types';
import { ActionsClient } from '@kbn/actions-plugin/server/actions_client';
import { chunk } from 'lodash';
import { GetSummarizedAlertsParams, IAlertsClient } from '../alerts_client/types';
import { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';
import { parseDuration, CombinedSummarizedAlerts, ThrottledActions } from '../types';
import { RuleRunMetricsStore } from '../lib/rule_run_metrics_store';
import { injectActionParams } from './inject_action_params';
import { Executable, ExecutionHandlerOptions, RuleTaskInstance } from './types';
import { TaskRunnerContext } from './task_runner_factory';
import { transformActionParams, transformSummaryActionParams } from './transform_action_params';
import { Alert } from '../alert';
import { NormalizedRuleType } from '../rule_type_registry';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleAction,
  RuleTypeParams,
  RuleTypeState,
  SanitizedRule,
  RuleAlertData,
} from '../../common';
import {
  generateActionHash,
  getSummaryActionsFromTaskState,
  getSummaryActionTimeBounds,
  isActionOnInterval,
  isSummaryAction,
  isSummaryActionOnInterval,
  isSummaryActionThrottled,
} from './rule_action_helper';

enum Reasons {
  MUTED = 'muted',
  THROTTLED = 'throttled',
  ACTION_GROUP_NOT_CHANGED = 'actionGroupHasNotChanged',
}

export interface RunResult {
  throttledSummaryActions: ThrottledActions;
}

export interface RuleUrl {
  absoluteUrl?: string;
  kibanaBaseUrl?: string;
  basePathname?: string;
  spaceIdSegment?: string;
  relativePath?: string;
}

export class ExecutionHandler<
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams,
  RuleState extends RuleTypeState,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string,
  AlertData extends RuleAlertData
> {
  private logger: Logger;
  private alertingEventLogger: PublicMethodsOf<AlertingEventLogger>;
  private rule: SanitizedRule<Params>;
  private ruleType: NormalizedRuleType<
    Params,
    ExtractedParams,
    RuleState,
    State,
    Context,
    ActionGroupIds,
    RecoveryActionGroupId,
    AlertData
  >;
  private taskRunnerContext: TaskRunnerContext;
  private taskInstance: RuleTaskInstance;
  private ruleRunMetricsStore: RuleRunMetricsStore;
  private apiKey: string | null;
  private ruleConsumer: string;
  private executionId: string;
  private ruleLabel: string;
  private ephemeralActionsToSchedule: number;
  private CHUNK_SIZE = 1000;
  private skippedAlerts: { [key: string]: { reason: string } } = {};
  private actionsClient: PublicMethodsOf<ActionsClient>;
  private ruleTypeActionGroups?: Map<ActionGroupIds | RecoveryActionGroupId, string>;
  private mutedAlertIdsSet: Set<string> = new Set();
  private previousStartedAt: Date | null;
  private maintenanceWindowIds: string[] = [];
  private alertsClient: IAlertsClient<
    AlertData,
    State,
    Context,
    ActionGroupIds,
    RecoveryActionGroupId
  >;

  constructor({
    rule,
    ruleType,
    logger,
    alertingEventLogger,
    taskRunnerContext,
    taskInstance,
    ruleRunMetricsStore,
    apiKey,
    ruleConsumer,
    executionId,
    ruleLabel,
    previousStartedAt,
    actionsClient,
    maintenanceWindowIds,
    alertsClient,
  }: ExecutionHandlerOptions<
    Params,
    ExtractedParams,
    RuleState,
    State,
    Context,
    ActionGroupIds,
    RecoveryActionGroupId,
    AlertData
  >) {
    this.logger = logger;
    this.alertingEventLogger = alertingEventLogger;
    this.rule = rule;
    this.ruleType = ruleType;
    this.taskRunnerContext = taskRunnerContext;
    this.taskInstance = taskInstance;
    this.ruleRunMetricsStore = ruleRunMetricsStore;
    this.apiKey = apiKey;
    this.ruleConsumer = ruleConsumer;
    this.executionId = executionId;
    this.ruleLabel = ruleLabel;
    this.actionsClient = actionsClient;
    this.ephemeralActionsToSchedule = taskRunnerContext.maxEphemeralActionsPerRule;
    this.ruleTypeActionGroups = new Map(
      ruleType.actionGroups.map((actionGroup) => [actionGroup.id, actionGroup.name])
    );
    this.previousStartedAt = previousStartedAt;
    this.mutedAlertIdsSet = new Set(rule.mutedInstanceIds);
    this.maintenanceWindowIds = maintenanceWindowIds ?? [];
    this.alertsClient = alertsClient;
  }

  public async run(
    alerts: Record<string, Alert<State, Context, ActionGroupIds | RecoveryActionGroupId>>
  ): Promise<RunResult> {
    const throttledSummaryActions: ThrottledActions = getSummaryActionsFromTaskState({
      actions: this.rule.actions,
      summaryActions: this.taskInstance.state?.summaryActions,
    });
    const executables = await this.generateExecutables(alerts, throttledSummaryActions);

    if (!!executables.length) {
      const {
        CHUNK_SIZE,
        logger,
        alertingEventLogger,
        ruleRunMetricsStore,
        taskRunnerContext: { actionsConfigMap, actionsPlugin },
        taskInstance: {
          params: { spaceId, alertId: ruleId },
        },
      } = this;

      const logActions = [];
      const bulkActions: EnqueueExecutionOptions[] = [];

      this.ruleRunMetricsStore.incrementNumberOfGeneratedActions(executables.length);

      for (const { action, alert, summarizedAlerts } of executables) {
        const { actionTypeId } = action;
        const actionGroup = action.group as ActionGroupIds;

        ruleRunMetricsStore.incrementNumberOfGeneratedActionsByConnectorType(actionTypeId);

        if (ruleRunMetricsStore.hasReachedTheExecutableActionsLimit(actionsConfigMap)) {
          ruleRunMetricsStore.setTriggeredActionsStatusByConnectorType({
            actionTypeId,
            status: ActionsCompletion.PARTIAL,
          });
          logger.debug(
            `Rule "${this.rule.id}" skipped scheduling action "${action.id}" because the maximum number of allowed actions has been reached.`
          );
          break;
        }

        if (
          ruleRunMetricsStore.hasReachedTheExecutableActionsLimitByConnectorType({
            actionTypeId,
            actionsConfigMap,
          })
        ) {
          if (!ruleRunMetricsStore.hasConnectorTypeReachedTheLimit(actionTypeId)) {
            logger.debug(
              `Rule "${this.rule.id}" skipped scheduling action "${action.id}" because the maximum number of allowed actions for connector type ${actionTypeId} has been reached.`
            );
          }
          ruleRunMetricsStore.setTriggeredActionsStatusByConnectorType({
            actionTypeId,
            status: ActionsCompletion.PARTIAL,
          });
          continue;
        }

        if (!this.isExecutableAction(action)) {
          this.logger.warn(
            `Rule "${this.taskInstance.params.alertId}" skipped scheduling action "${action.id}" because it is disabled`
          );
          continue;
        }

        ruleRunMetricsStore.incrementNumberOfTriggeredActions();
        ruleRunMetricsStore.incrementNumberOfTriggeredActionsByConnectorType(actionTypeId);

        if (summarizedAlerts) {
          const { start, end } = getSummaryActionTimeBounds(
            action,
            this.rule.schedule,
            this.previousStartedAt
          );
          const ruleUrl = this.buildRuleUrl(spaceId, start, end);
          const actionToRun = {
            ...action,
            params: injectActionParams({
              actionTypeId,
              ruleUrl,
              actionParams: transformSummaryActionParams({
                alerts: summarizedAlerts,
                rule: this.rule,
                ruleTypeId: this.ruleType.id,
                actionId: action.id,
                actionParams: action.params,
                spaceId,
                actionsPlugin,
                actionTypeId,
                kibanaBaseUrl: this.taskRunnerContext.kibanaBaseUrl,
                ruleUrl: ruleUrl?.absoluteUrl,
              }),
            }),
          };

          await this.actionRunOrAddToBulk({
            enqueueOptions: this.getEnqueueOptions(actionToRun),
            bulkActions,
          });

          if (isActionOnInterval(action)) {
            throttledSummaryActions[action.uuid!] = { date: new Date().toISOString() };
          }

          logActions.push({
            id: action.id,
            typeId: action.actionTypeId,
            alertSummary: {
              new: summarizedAlerts.new.count,
              ongoing: summarizedAlerts.ongoing.count,
              recovered: summarizedAlerts.recovered.count,
            },
          });
        } else {
          const ruleUrl = this.buildRuleUrl(spaceId);
          const actionToRun = {
            ...action,
            params: injectActionParams({
              actionTypeId,
              ruleUrl,
              actionParams: transformActionParams({
                actionsPlugin,
                alertId: ruleId,
                alertType: this.ruleType.id,
                actionTypeId,
                alertName: this.rule.name,
                spaceId,
                tags: this.rule.tags,
                alertInstanceId: alert.getId(),
                alertUuid: alert.getUuid(),
                alertActionGroup: actionGroup,
                alertActionGroupName: this.ruleTypeActionGroups!.get(actionGroup)!,
                context: alert.getContext(),
                actionId: action.id,
                state: alert.getState(),
                kibanaBaseUrl: this.taskRunnerContext.kibanaBaseUrl,
                alertParams: this.rule.params,
                actionParams: action.params,
                flapping: alert.getFlapping(),
                ruleUrl: ruleUrl?.absoluteUrl,
              }),
            }),
          };

          await this.actionRunOrAddToBulk({
            enqueueOptions: this.getEnqueueOptions(actionToRun),
            bulkActions,
          });

          logActions.push({
            id: action.id,
            typeId: action.actionTypeId,
            alertId: alert.getId(),
            alertGroup: action.group,
          });

          if (!this.isRecoveredAlert(actionGroup)) {
            if (isActionOnInterval(action)) {
              alert.updateLastScheduledActions(
                action.group as ActionGroupIds,
                generateActionHash(action),
                action.uuid
              );
            } else {
              alert.updateLastScheduledActions(action.group as ActionGroupIds);
            }
            alert.unscheduleActions();
          }
        }
      }

      if (!!bulkActions.length) {
        for (const c of chunk(bulkActions, CHUNK_SIZE)) {
          try {
            await this.actionsClient!.bulkEnqueueExecution(c);
          } catch (error) {
            if (
              error.message ===
              'Unable to execute actions because the maximum number of queued actions has been reached.'
            ) {
              ruleRunMetricsStore.setHasReachedQueuedActionsLimit(true);
              this.setBulkActionsStatus(logger, ruleRunMetricsStore, c);
            } else {
              throw error;
            }
          }
        }
      }

      if (!!logActions.length) {
        for (const action of logActions) {
          alertingEventLogger.logAction(action);
        }
      }
    }
    return { throttledSummaryActions };
  }

  private setBulkActionsStatus(
    logger: Logger,
    ruleRunMetricsStore: RuleRunMetricsStore,
    actions: EnqueueExecutionOptions[]
  ) {
    for (const action of actions) {
      ruleRunMetricsStore.decrementNumberOfTriggeredActions();
      ruleRunMetricsStore.decrementNumberOfTriggeredActionsByConnectorType(action.actionTypeId);
      ruleRunMetricsStore.setTriggeredActionsStatusByConnectorType({
        actionTypeId: action.actionTypeId,
        status: ActionsCompletion.PARTIAL,
      });

      logger.debug(
        `Rule "${this.rule.id}" skipped scheduling action "${action.id}" because the maximum number of queued actions has been reached.`
      );
    }
  }

  private logNumberOfFilteredAlerts({
    numberOfAlerts = 0,
    numberOfSummarizedAlerts = 0,
    action,
  }: {
    numberOfAlerts: number;
    numberOfSummarizedAlerts: number;
    action: RuleAction;
  }) {
    const count = numberOfAlerts - numberOfSummarizedAlerts;
    if (count > 0) {
      this.logger.debug(
        `(${count}) alert${count > 1 ? 's' : ''} ${
          count > 1 ? 'have' : 'has'
        } been filtered out for: ${action.actionTypeId}:${action.uuid}`
      );
    }
  }

  private isAlertMuted(alertId: string) {
    const muted = this.mutedAlertIdsSet.has(alertId);
    if (muted) {
      if (
        !this.skippedAlerts[alertId] ||
        (this.skippedAlerts[alertId] && this.skippedAlerts[alertId].reason !== Reasons.MUTED)
      ) {
        this.logger.debug(
          `skipping scheduling of actions for '${alertId}' in rule ${this.ruleLabel}: rule is muted`
        );
      }
      this.skippedAlerts[alertId] = { reason: Reasons.MUTED };
      return true;
    }
    return false;
  }

  private isExecutableAction(action: RuleAction) {
    return this.taskRunnerContext.actionsPlugin.isActionExecutable(action.id, action.actionTypeId, {
      notifyUsage: true,
    });
  }

  private isRecoveredAlert(actionGroup: string) {
    return actionGroup === this.ruleType.recoveryActionGroup.id;
  }

  private isExecutableActiveAlert({
    alert,
    action,
  }: {
    alert: Alert<AlertInstanceState, AlertInstanceContext, ActionGroupIds | RecoveryActionGroupId>;
    action: RuleAction;
  }) {
    const alertId = alert.getId();
    const { rule, ruleLabel, logger } = this;
    const notifyWhen = action.frequency?.notifyWhen || rule.notifyWhen;

    if (notifyWhen === 'onActionGroupChange' && !alert.scheduledActionGroupHasChanged()) {
      if (
        !this.skippedAlerts[alertId] ||
        (this.skippedAlerts[alertId] &&
          this.skippedAlerts[alertId].reason !== Reasons.ACTION_GROUP_NOT_CHANGED)
      ) {
        logger.debug(
          `skipping scheduling of actions for '${alertId}' in rule ${ruleLabel}: alert is active but action group has not changed`
        );
      }
      this.skippedAlerts[alertId] = { reason: Reasons.ACTION_GROUP_NOT_CHANGED };
      return false;
    }

    if (notifyWhen === 'onThrottleInterval') {
      const throttled = action.frequency?.throttle
        ? alert.isThrottled({
            throttle: action.frequency.throttle ?? null,
            actionHash: generateActionHash(action), // generateActionHash must be removed once all the hash identifiers removed from the task state
            uuid: action.uuid,
          })
        : alert.isThrottled({ throttle: rule.throttle ?? null });

      if (throttled) {
        if (
          !this.skippedAlerts[alertId] ||
          (this.skippedAlerts[alertId] && this.skippedAlerts[alertId].reason !== Reasons.THROTTLED)
        ) {
          logger.debug(
            `skipping scheduling of actions for '${alertId}' in rule ${ruleLabel}: rule is throttled`
          );
        }
        this.skippedAlerts[alertId] = { reason: Reasons.THROTTLED };
        return false;
      }
    }

    return alert.hasScheduledActions();
  }

  private getActionGroup(alert: Alert<State, Context, ActionGroupIds | RecoveryActionGroupId>) {
    return alert.getScheduledActionOptions()?.actionGroup || this.ruleType.recoveryActionGroup.id;
  }

  private buildRuleUrl(spaceId: string, start?: number, end?: number): RuleUrl | undefined {
    if (!this.taskRunnerContext.kibanaBaseUrl) {
      return;
    }

    const relativePath = this.ruleType.getViewInAppRelativeUrl
      ? this.ruleType.getViewInAppRelativeUrl({ rule: this.rule, start, end })
      : `${triggersActionsRoute}${getRuleDetailsRoute(this.rule.id)}`;

    try {
      const basePathname = new URL(this.taskRunnerContext.kibanaBaseUrl).pathname;
      const basePathnamePrefix = basePathname !== '/' ? `${basePathname}` : '';
      const spaceIdSegment = spaceId !== 'default' ? `/s/${spaceId}` : '';

      const ruleUrl = new URL(
        [basePathnamePrefix, spaceIdSegment, relativePath].join(''),
        this.taskRunnerContext.kibanaBaseUrl
      );

      return {
        absoluteUrl: ruleUrl.toString(),
        kibanaBaseUrl: this.taskRunnerContext.kibanaBaseUrl,
        basePathname: basePathnamePrefix,
        spaceIdSegment,
        relativePath,
      };
    } catch (error) {
      this.logger.debug(
        `Rule "${this.rule.id}" encountered an error while constructing the rule.url variable: ${error.message}`
      );
      return;
    }
  }

  private getEnqueueOptions(action: RuleAction): EnqueueExecutionOptions {
    const {
      apiKey,
      ruleConsumer,
      executionId,
      taskInstance: {
        params: { spaceId, alertId: ruleId },
      },
    } = this;

    const namespace = spaceId === 'default' ? {} : { namespace: spaceId };
    return {
      id: action.id,
      params: action.params,
      spaceId,
      apiKey: apiKey ?? null,
      consumer: ruleConsumer,
      source: asSavedObjectExecutionSource({
        id: ruleId,
        type: 'alert',
      }),
      executionId,
      relatedSavedObjects: [
        {
          id: ruleId,
          type: 'alert',
          namespace: namespace.namespace,
          typeId: this.ruleType.id,
        },
      ],
      actionTypeId: action.actionTypeId,
    };
  }

  private async generateExecutables(
    alerts: Record<string, Alert<State, Context, ActionGroupIds | RecoveryActionGroupId>>,
    throttledSummaryActions: ThrottledActions
  ): Promise<Array<Executable<State, Context, ActionGroupIds, RecoveryActionGroupId>>> {
    const executables = [];

    for (const action of this.rule.actions) {
      const alertsArray = Object.entries(alerts);
      let summarizedAlerts = null;

      if (this.shouldGetSummarizedAlerts({ action, throttledSummaryActions })) {
        summarizedAlerts = await this.getSummarizedAlerts({
          action,
          spaceId: this.taskInstance.params.spaceId,
          ruleId: this.taskInstance.params.alertId,
        });
        if (!isSummaryActionOnInterval(action)) {
          this.logNumberOfFilteredAlerts({
            numberOfAlerts: alertsArray.length,
            numberOfSummarizedAlerts: summarizedAlerts.all.count,
            action,
          });
        }
      }

      // By doing that we are not cancelling the summary action but just waiting
      // for the window maintenance to be over before sending the summary action
      if (isSummaryAction(action) && this.maintenanceWindowIds.length > 0) {
        this.logger.debug(
          `no scheduling of summary actions "${action.id}" for rule "${
            this.taskInstance.params.alertId
          }": has active maintenance windows ${this.maintenanceWindowIds.join()}.`
        );
        continue;
      } else if (isSummaryAction(action)) {
        if (summarizedAlerts && summarizedAlerts.all.count !== 0) {
          executables.push({ action, summarizedAlerts });
        }
        continue;
      }

      for (const [alertId, alert] of alertsArray) {
        if (alert.isFilteredOut(summarizedAlerts)) {
          continue;
        }

        if (alert.getMaintenanceWindowIds().length > 0) {
          this.logger.debug(
            `no scheduling of actions "${action.id}" for rule "${
              this.taskInstance.params.alertId
            }": has active maintenance windows ${alert.getMaintenanceWindowIds().join()}.`
          );
          continue;
        }

        const actionGroup = this.getActionGroup(alert);

        if (!this.ruleTypeActionGroups!.has(actionGroup)) {
          this.logger.error(
            `Invalid action group "${actionGroup}" for rule "${this.ruleType.id}".`
          );
          continue;
        }
        if (action.group === actionGroup && !this.isAlertMuted(alertId)) {
          if (
            this.isRecoveredAlert(action.group) ||
            this.isExecutableActiveAlert({ alert, action })
          ) {
            executables.push({ action, alert });
          }
        }
      }
    }

    return executables;
  }

  private canGetSummarizedAlerts() {
    return !!this.ruleType.alerts && !!this.alertsClient.getSummarizedAlerts;
  }

  private shouldGetSummarizedAlerts({
    action,
    throttledSummaryActions,
  }: {
    action: RuleAction;
    throttledSummaryActions: ThrottledActions;
  }) {
    if (!this.canGetSummarizedAlerts()) {
      if (action.frequency?.summary) {
        this.logger.error(
          `Skipping action "${action.id}" for rule "${this.rule.id}" because the rule type "${this.ruleType.name}" does not support alert-as-data.`
        );
      }
      return false;
    }

    // we fetch summarizedAlerts to filter alerts in memory as well
    if (!isSummaryAction(action) && !action.alertsFilter) {
      return false;
    }

    if (
      isSummaryAction(action) &&
      isSummaryActionThrottled({
        action,
        throttledSummaryActions,
        logger: this.logger,
      })
    ) {
      return false;
    }

    return true;
  }

  private async getSummarizedAlerts({
    action,
    ruleId,
    spaceId,
  }: {
    action: RuleAction;
    ruleId: string;
    spaceId: string;
  }): Promise<CombinedSummarizedAlerts> {
    const optionsBase = {
      ruleId,
      spaceId,
      excludedAlertInstanceIds: this.rule.mutedInstanceIds,
      alertsFilter: action.alertsFilter,
    };

    let options: GetSummarizedAlertsParams;

    if (isActionOnInterval(action)) {
      const throttleMills = parseDuration(action.frequency!.throttle!);
      const start = new Date(Date.now() - throttleMills);

      options = {
        ...optionsBase,
        start,
        end: new Date(),
      };
    } else {
      options = {
        ...optionsBase,
        executionUuid: this.executionId,
      };
    }
    const alerts = await this.alertsClient.getSummarizedAlerts!(options);

    const total = alerts.new.count + alerts.ongoing.count + alerts.recovered.count;
    return {
      ...alerts,
      all: {
        count: total,
        data: [...alerts.new.data, ...alerts.ongoing.data, ...alerts.recovered.data],
      },
    };
  }

  private async actionRunOrAddToBulk({
    enqueueOptions,
    bulkActions,
  }: {
    enqueueOptions: EnqueueExecutionOptions;
    bulkActions: EnqueueExecutionOptions[];
  }) {
    if (this.taskRunnerContext.supportsEphemeralTasks && this.ephemeralActionsToSchedule > 0) {
      this.ephemeralActionsToSchedule--;
      try {
        await this.actionsClient!.ephemeralEnqueuedExecution(enqueueOptions);
      } catch (err) {
        if (isEphemeralTaskRejectedDueToCapacityError(err)) {
          bulkActions.push(enqueueOptions);
        }
      }
    } else {
      bulkActions.push(enqueueOptions);
    }
  }
}
