/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { Logger } from '@kbn/core/server';
import { ALERT_UUID, getRuleDetailsRoute, triggersActionsRoute } from '@kbn/rule-data-utils';
import { asSavedObjectExecutionSource } from '@kbn/actions-plugin/server';
import { isEphemeralTaskRejectedDueToCapacityError } from '@kbn/task-manager-plugin/server';
import {
  ExecuteOptions as EnqueueExecutionOptions,
  ExecutionResponseItem,
  ExecutionResponseType,
} from '@kbn/actions-plugin/server/create_execute_function';
import { ActionsCompletion } from '@kbn/alerting-state-types';
import { ActionsClient } from '@kbn/actions-plugin/server/actions_client';
import { chunk } from 'lodash';
import { GetSummarizedAlertsParams, IAlertsClient } from '../alerts_client/types';
import {
  AlertingEventLogger,
  ActionOpts as EventLogAction,
} from '../lib/alerting_event_logger/alerting_event_logger';
import { AlertHit, parseDuration, CombinedSummarizedAlerts, ThrottledActions } from '../types';
import { RuleRunMetricsStore } from '../lib/rule_run_metrics_store';
import { injectActionParams } from './inject_action_params';
import { Executable, ExecutionHandlerOptions, RuleTaskInstance } from './types';
import { TaskRunnerContext } from './task_runner_factory';
import {
  transformActionParams,
  TransformActionParamsOptions,
  transformSummaryActionParams,
} from './transform_action_params';
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
  RuleDefaultAction,
  RuleSystemAction,
  RuleNotifyWhen,
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
import { ConnectorAdapter } from '../connector_adapters/types';
import { isSystemAction } from '../../common/system_actions/is_system_action';

enum Reasons {
  MUTED = 'muted',
  THROTTLED = 'throttled',
  ACTION_GROUP_NOT_CHANGED = 'actionGroupHasNotChanged',
}

export interface RunResult {
  throttledSummaryActions: ThrottledActions;
}

interface RunSummarizedActionArgs {
  action: RuleDefaultAction;
  summarizedAlerts: CombinedSummarizedAlerts;
  spaceId: string;
}

interface RunActionArgs<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  action: RuleDefaultAction;
  alert: Alert<State, Context, ActionGroupIds | RecoveryActionGroupId>;
  ruleId: string;
  spaceId: string;
}

interface RunSystemActionArgs<Params extends RuleTypeParams> {
  action: RuleSystemAction;
  connectorAdapter: ConnectorAdapter;
  summarizedAlerts: CombinedSummarizedAlerts;
  rule: SanitizedRule<Params>;
  spaceId: string;
}

interface RunActionReturnValue {
  actionsToEnqueueForExecution: EnqueueExecutionOptions[];
  actionsToLog: Record<string, EventLogAction>;
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

    if (executables.length === 0) {
      return { throttledSummaryActions };
    }

    const {
      logger,
      ruleRunMetricsStore,
      taskRunnerContext: { actionsConfigMap },
      taskInstance: {
        params: { spaceId, alertId: ruleId },
      },
    } = this;

    const logActions: Record<string, EventLogAction> = {};
    const enqueueActions: EnqueueExecutionOptions[] = [];

    this.ruleRunMetricsStore.incrementNumberOfGeneratedActions(executables.length);

    for (const { action, alert, summarizedAlerts } of executables) {
      const { actionTypeId } = action;

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

      if (summarizedAlerts && !isSystemAction(action)) {
        const { actionsToEnqueueForExecution, actionsToLog } = await this.runSummarizedAction({
          action,
          summarizedAlerts,
          spaceId,
        });

        enqueueActions.push(...actionsToEnqueueForExecution);
        Object.assign(logActions, actionsToLog);

        if (isActionOnInterval(action)) {
          throttledSummaryActions[action.uuid!] = { date: new Date().toISOString() };
        }
      } else if (isSystemAction(action) && summarizedAlerts) {
        const hasConnectorAdapter = this.taskRunnerContext.connectorAdapterRegistry.has(
          action.actionTypeId
        );

        /**
         * System actions without an adapter
         * cannot be executed
         *
         */
        if (!hasConnectorAdapter) {
          this.logger.warn(
            `Rule "${this.taskInstance.params.alertId}" skipped scheduling system action "${action.id}" because no connector adapter is configured`
          );

          continue;
        }

        const connectorAdapter = this.taskRunnerContext.connectorAdapterRegistry.get(
          action.actionTypeId
        );

        const { actionsToEnqueueForExecution, actionsToLog } = await this.runSystemAction({
          action,
          connectorAdapter,
          summarizedAlerts,
          rule: this.rule,
          spaceId,
        });

        enqueueActions.push(...actionsToEnqueueForExecution);
        Object.assign(logActions, actionsToLog);
      } else if (!isSystemAction(action) && alert) {
        const { actionsToEnqueueForExecution, actionsToLog } = await this.runAction({
          action,
          spaceId,
          alert,
          ruleId,
        });

        enqueueActions.push(...actionsToEnqueueForExecution);
        Object.assign(logActions, actionsToLog);

        if (!this.isRecoveredAlert(action.group)) {
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

    const errorActionIds = await this.bulkEnqueueForExecution(enqueueActions);
    this.bulkLogActions(logActions, errorActionIds);

    return { throttledSummaryActions };
  }

  private async runSummarizedAction({
    action,
    summarizedAlerts,
    spaceId,
  }: RunSummarizedActionArgs): Promise<RunActionReturnValue> {
    const { start, end } = getSummaryActionTimeBounds(
      action,
      this.rule.schedule,
      this.previousStartedAt
    );
    const ruleUrl = this.buildRuleUrl(spaceId, start, end);
    const actionToRun = {
      ...action,
      params: injectActionParams({
        actionTypeId: action.actionTypeId,
        ruleUrl,
        ruleName: this.rule.name,
        actionParams: transformSummaryActionParams({
          alerts: summarizedAlerts,
          rule: this.rule,
          ruleTypeId: this.ruleType.id,
          actionId: action.id,
          actionParams: action.params,
          spaceId,
          actionsPlugin: this.taskRunnerContext.actionsPlugin,
          actionTypeId: action.actionTypeId,
          kibanaBaseUrl: this.taskRunnerContext.kibanaBaseUrl,
          ruleUrl: ruleUrl?.absoluteUrl,
        }),
      }),
    };

    const actionsToEnqueueForExecution = await this.actionRunOrAddToBulk({
      enqueueOptions: this.getEnqueueOptions(actionToRun),
    });

    return {
      actionsToEnqueueForExecution,
      actionsToLog: {
        [action.id]: {
          id: action.id,
          typeId: action.actionTypeId,
          alertSummary: {
            new: summarizedAlerts.new.count,
            ongoing: summarizedAlerts.ongoing.count,
            recovered: summarizedAlerts.recovered.count,
          },
        },
      },
    };
  }

  private async runAction({
    action,
    spaceId,
    alert,
    ruleId,
  }: RunActionArgs<
    State,
    Context,
    ActionGroupIds,
    RecoveryActionGroupId
  >): Promise<RunActionReturnValue> {
    const ruleUrl = this.buildRuleUrl(spaceId);
    const executableAlert = alert!;
    const actionGroup = action.group as ActionGroupIds;
    const transformActionParamsOptions: TransformActionParamsOptions = {
      actionsPlugin: this.taskRunnerContext.actionsPlugin,
      alertId: ruleId,
      alertType: this.ruleType.id,
      actionTypeId: action.actionTypeId,
      alertName: this.rule.name,
      spaceId,
      tags: this.rule.tags,
      alertInstanceId: executableAlert.getId(),
      alertUuid: executableAlert.getUuid(),
      alertActionGroup: actionGroup,
      alertActionGroupName: this.ruleTypeActionGroups!.get(actionGroup)!,
      context: executableAlert.getContext(),
      actionId: action.id,
      state: executableAlert.getState(),
      kibanaBaseUrl: this.taskRunnerContext.kibanaBaseUrl,
      alertParams: this.rule.params,
      actionParams: action.params,
      flapping: executableAlert.getFlapping(),
      ruleUrl: ruleUrl?.absoluteUrl,
    };

    if (executableAlert.isAlertAsData()) {
      transformActionParamsOptions.aadAlert = executableAlert.getAlertAsData();
    }
    const actionToRun = {
      ...action,
      params: injectActionParams({
        actionTypeId: action.actionTypeId,
        ruleUrl,
        ruleName: this.rule.name,
        actionParams: transformActionParams(transformActionParamsOptions),
      }),
    };

    const actionsToEnqueueForExecution = await this.actionRunOrAddToBulk({
      enqueueOptions: this.getEnqueueOptions(actionToRun),
    });

    return {
      actionsToEnqueueForExecution,
      actionsToLog: {
        [action.id]: {
          id: action.id,
          typeId: action.actionTypeId,
          alertId: alert.getId(),
          alertGroup: action.group,
        },
      },
    };
  }

  private async runSystemAction({
    action,
    spaceId,
    connectorAdapter,
    summarizedAlerts,
    rule,
  }: RunSystemActionArgs<Params>): Promise<RunActionReturnValue> {
    const { start, end } = getSummaryActionTimeBounds(
      action,
      this.rule.schedule,
      this.previousStartedAt
    );

    const ruleUrl = this.buildRuleUrl(spaceId, start, end);

    const connectorAdapterActionParams = connectorAdapter.buildActionParams({
      alerts: summarizedAlerts,
      rule: { id: rule.id, tags: rule.tags, name: rule.name },
      ruleUrl: ruleUrl?.absoluteUrl,
      spaceId,
      params: action.params,
    });

    const actionToRun = Object.assign(action, { params: connectorAdapterActionParams });

    const actionsToEnqueueForExecution = await this.actionRunOrAddToBulk({
      enqueueOptions: this.getEnqueueOptions(actionToRun),
    });

    return {
      actionsToEnqueueForExecution,
      actionsToLog: {
        [action.id]: {
          id: action.id,
          typeId: action.actionTypeId,
          alertSummary: {
            new: summarizedAlerts.new.count,
            ongoing: summarizedAlerts.ongoing.count,
            recovered: summarizedAlerts.recovered.count,
          },
        },
      },
    };
  }

  private async bulkEnqueueForExecution(actions: EnqueueExecutionOptions[]): Promise<Set<string>> {
    const errorResponses: ExecutionResponseItem[] = [];
    const errorResponseActionIds = new Set<string>();

    if (!!actions.length) {
      for (const c of chunk(actions, this.CHUNK_SIZE)) {
        const res = await this.actionsClient!.bulkEnqueueExecution(c);

        if (res.errors) {
          const queuedActionsLimitErrors = res.items.filter(
            (resItem) => resItem.response === ExecutionResponseType.QUEUED_ACTIONS_LIMIT_ERROR
          );

          errorResponses.push(...queuedActionsLimitErrors);
        }
      }
    }

    if (!!errorResponses.length) {
      for (const errorResponse of errorResponses) {
        if (errorResponse.response === ExecutionResponseType.QUEUED_ACTIONS_LIMIT_ERROR) {
          this.ruleRunMetricsStore.setHasReachedQueuedActionsLimit(true);
          this.ruleRunMetricsStore.decrementNumberOfTriggeredActions();

          this.ruleRunMetricsStore.decrementNumberOfTriggeredActionsByConnectorType(
            errorResponse.actionTypeId
          );

          this.ruleRunMetricsStore.setTriggeredActionsStatusByConnectorType({
            actionTypeId: errorResponse.actionTypeId,
            status: ActionsCompletion.PARTIAL,
          });

          this.logger.debug(
            `Rule "${this.rule.id}" skipped scheduling action "${errorResponse.id}" because the maximum number of queued actions has been reached.`
          );

          errorResponseActionIds.add(errorResponse.id);
        }
      }
    }

    return errorResponseActionIds;
  }

  private async bulkLogActions(
    logActions: Record<string, EventLogAction>,
    errorActionIds: Set<string>
  ) {
    const logActionsEntries = Object.entries(logActions);

    if (!!logActionsEntries.length) {
      for (const [id, actionToBeLogged] of logActionsEntries) {
        if (!errorActionIds.has(id)) {
          this.alertingEventLogger.logAction(actionToBeLogged);
        }
      }
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
    action: RuleDefaultAction;
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

        /**
         * System actions cannot be throttled
         */
        if (!isSummaryActionOnInterval(action) || isSystemAction(action)) {
          this.logNumberOfFilteredAlerts({
            numberOfAlerts: alertsArray.length,
            numberOfSummarizedAlerts: summarizedAlerts.all.count,
            action,
          });
        }
      }

      if (isSummaryAction(action) || isSystemAction(action)) {
        if (summarizedAlerts && summarizedAlerts.all.count !== 0) {
          executables.push({ action, summarizedAlerts });
        }

        continue;
      }

      for (const [alertId, alert] of alertsArray) {
        const alertMaintenanceWindowIds = alert.getMaintenanceWindowIds();
        if (alertMaintenanceWindowIds.length !== 0) {
          this.logger.debug(
            `no scheduling of summary actions "${action.id}" for rule "${
              this.taskInstance.params.alertId
            }": has active maintenance windows ${alertMaintenanceWindowIds.join()}.`
          );
          continue;
        }

        if (alert.isFilteredOut(summarizedAlerts)) {
          continue;
        }

        const actionGroup = this.getActionGroup(alert);

        if (!this.ruleTypeActionGroups!.has(actionGroup)) {
          this.logger.error(
            `Invalid action group "${actionGroup}" for rule "${this.ruleType.id}".`
          );
          continue;
        }

        // only actions with notifyWhen set to "on status change" should return
        // notifications for flapping pending recovered alerts
        if (
          alert.getPendingRecoveredCount() > 0 &&
          action.frequency?.notifyWhen !== RuleNotifyWhen.CHANGE
        ) {
          continue;
        }

        if (summarizedAlerts) {
          const alertAsData = summarizedAlerts.all.data.find(
            (alertHit: AlertHit) => alertHit._id === alert.getUuid()
          );
          if (alertAsData) {
            alert.setAlertAsData(alertAsData);
          }
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
      if (isSystemAction(action) || action.frequency?.summary) {
        this.logger.error(
          `Skipping action "${action.id}" for rule "${this.rule.id}" because the rule type "${this.ruleType.name}" does not support alert-as-data.`
        );
      }

      return false;
    }

    /**
     * System action should always get summarized alerts.
     * The above check ensures that the rule supports
     * alerts-as-data which are needed by system actions.
     */
    if (isSystemAction(action)) {
      return true;
    }

    if (action.useAlertDataForTemplate) {
      return true;
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
      alertsFilter: isSystemAction(action) ? undefined : action.alertsFilter,
    };

    let options: GetSummarizedAlertsParams;

    if (isActionOnInterval(action) && !isSystemAction(action)) {
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

    /**
     * We need to remove all new alerts with maintenance windows retrieved from
     * getSummarizedAlerts because they might not have maintenance window IDs
     * associated with them from maintenance windows with scoped query updated
     * yet (the update call uses refresh: false). So we need to rely on the in
     * memory alerts to do this.
     */
    const newAlertsInMemory =
      Object.values(this.alertsClient.getProcessedAlerts('new') || {}) || [];

    const newAlertsWithMaintenanceWindowIds = newAlertsInMemory.reduce<string[]>(
      (result, alert) => {
        if (alert.getMaintenanceWindowIds().length > 0) {
          result.push(alert.getUuid());
        }
        return result;
      },
      []
    );

    const newAlerts = alerts.new.data.filter((alert) => {
      return !newAlertsWithMaintenanceWindowIds.includes(alert[ALERT_UUID]);
    });

    const total = newAlerts.length + alerts.ongoing.count + alerts.recovered.count;
    return {
      ...alerts,
      new: {
        count: newAlerts.length,
        data: newAlerts,
      },
      all: {
        count: total,
        data: [...newAlerts, ...alerts.ongoing.data, ...alerts.recovered.data],
      },
    };
  }

  private async actionRunOrAddToBulk({
    enqueueOptions,
  }: {
    enqueueOptions: EnqueueExecutionOptions;
  }): Promise<EnqueueExecutionOptions[]> {
    const bulkActions: EnqueueExecutionOptions[] = [];

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

    return bulkActions;
  }
}
