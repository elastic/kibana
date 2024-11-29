/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertInstanceState, AlertInstanceContext } from '@kbn/alerting-state-types';
import { RuleAction, RuleNotifyWhen, RuleTypeParams } from '@kbn/alerting-types';
import { compact } from 'lodash';
import { RuleTypeState, RuleAlertData, parseDuration } from '../../../../common';
import { GetSummarizedAlertsParams } from '../../../alerts_client/types';
import { AlertHit } from '../../../types';
import { Alert } from '../../../alert';
import {
  buildRuleUrl,
  formatActionToEnqueue,
  generateActionHash,
  getSummarizedAlerts,
  isActionOnInterval,
  isSummaryAction,
  logNumberOfFilteredAlerts,
  shouldScheduleAction,
} from '../lib';
import {
  ActionSchedulerOptions,
  ActionsToSchedule,
  AddSummarizedAlertsOpts,
  GetActionsToScheduleOpts,
  HelperOpts,
  IActionScheduler,
  IsExecutableActiveAlertOpts,
  IsExecutableAlertOpts,
} from '../types';
import { TransformActionParamsOptions, transformActionParams } from '../../transform_action_params';
import { injectActionParams } from '../../inject_action_params';

enum Reasons {
  MUTED = 'muted',
  THROTTLED = 'throttled',
  ACTION_GROUP_NOT_CHANGED = 'actionGroupHasNotChanged',
}

export class PerAlertActionScheduler<
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams,
  RuleState extends RuleTypeState,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string,
  AlertData extends RuleAlertData
> implements IActionScheduler<State, Context, ActionGroupIds, RecoveryActionGroupId>
{
  private actions: RuleAction[] = [];
  private mutedAlertIdsSet: Set<string> = new Set();
  private ruleTypeActionGroups?: Map<ActionGroupIds | RecoveryActionGroupId, string>;
  private skippedAlerts: { [key: string]: { reason: string } } = {};

  constructor(
    private readonly context: ActionSchedulerOptions<
      Params,
      ExtractedParams,
      RuleState,
      State,
      Context,
      ActionGroupIds,
      RecoveryActionGroupId,
      AlertData
    >
  ) {
    this.ruleTypeActionGroups = new Map(
      context.ruleType.actionGroups.map((actionGroup) => [actionGroup.id, actionGroup.name])
    );
    this.mutedAlertIdsSet = new Set(context.rule.mutedInstanceIds);

    const canGetSummarizedAlerts =
      !!context.ruleType.alerts && !!context.alertsClient.getSummarizedAlerts;

    // filter for per-alert actions; if the action has an alertsFilter, check that
    // rule type supports summarized alerts and filter out if not
    this.actions = compact(
      (context.rule.actions ?? [])
        .filter((action) => !isSummaryAction(action))
        .map((action) => {
          if (!canGetSummarizedAlerts && action.alertsFilter) {
            this.context.logger.error(
              `Skipping action "${action.id}" for rule "${this.context.rule.id}" because the rule type "${this.context.ruleType.name}" does not support alert-as-data.`
            );
            return null;
          }

          return action;
        })
    );
  }

  public get priority(): number {
    return 2;
  }

  public async getActionsToSchedule({
    activeCurrentAlerts,
    recoveredCurrentAlerts,
  }: GetActionsToScheduleOpts<State, Context, ActionGroupIds, RecoveryActionGroupId>): Promise<
    ActionsToSchedule[]
  > {
    const executables: Array<{
      action: RuleAction;
      alert: Alert<State, Context, ActionGroupIds | RecoveryActionGroupId>;
    }> = [];
    const results: ActionsToSchedule[] = [];

    const activeCurrentAlertsArray = Object.values(activeCurrentAlerts || {});
    const recoveredCurrentAlertsArray = Object.values(recoveredCurrentAlerts || {});

    for (const action of this.actions) {
      let summarizedAlerts = null;

      if (action.useAlertDataForTemplate || action.alertsFilter) {
        const optionsBase = {
          spaceId: this.context.taskInstance.params.spaceId,
          ruleId: this.context.rule.id,
          excludedAlertInstanceIds: this.context.rule.mutedInstanceIds,
          alertsFilter: action.alertsFilter,
        };

        let options: GetSummarizedAlertsParams;
        if (isActionOnInterval(action)) {
          const throttleMills = parseDuration(action.frequency!.throttle!);
          const start = new Date(Date.now() - throttleMills);
          options = { ...optionsBase, start, end: new Date() };
        } else {
          options = { ...optionsBase, executionUuid: this.context.executionId };
        }
        summarizedAlerts = await getSummarizedAlerts({
          queryOptions: options,
          alertsClient: this.context.alertsClient,
        });

        logNumberOfFilteredAlerts({
          logger: this.context.logger,
          numberOfAlerts: activeCurrentAlertsArray.length + recoveredCurrentAlertsArray.length,
          numberOfSummarizedAlerts: summarizedAlerts.all.count,
          action,
        });
      }

      for (const alert of activeCurrentAlertsArray) {
        if (
          this.isExecutableAlert({ alert, action, summarizedAlerts }) &&
          this.isExecutableActiveAlert({ alert, action })
        ) {
          this.addSummarizedAlerts({ alert, summarizedAlerts });
          executables.push({ action, alert });
        }
      }

      if (this.isRecoveredAction(action.group)) {
        for (const alert of recoveredCurrentAlertsArray) {
          if (this.isExecutableAlert({ alert, action, summarizedAlerts })) {
            this.addSummarizedAlerts({ alert, summarizedAlerts });
            executables.push({ action, alert });
          }
        }
      }
    }

    if (executables.length === 0) return [];

    this.context.ruleRunMetricsStore.incrementNumberOfGeneratedActions(executables.length);

    const ruleUrl = buildRuleUrl({
      getViewInAppRelativeUrl: this.context.ruleType.getViewInAppRelativeUrl,
      kibanaBaseUrl: this.context.taskRunnerContext.kibanaBaseUrl,
      logger: this.context.logger,
      rule: this.context.rule,
      spaceId: this.context.taskInstance.params.spaceId,
    });

    for (const { action, alert } of executables) {
      const { actionTypeId } = action;

      if (
        !shouldScheduleAction({
          action,
          actionsConfigMap: this.context.taskRunnerContext.actionsConfigMap,
          isActionExecutable: this.context.taskRunnerContext.actionsPlugin.isActionExecutable,
          logger: this.context.logger,
          ruleId: this.context.rule.id,
          ruleRunMetricsStore: this.context.ruleRunMetricsStore,
        })
      ) {
        continue;
      }

      this.context.ruleRunMetricsStore.incrementNumberOfTriggeredActions();
      this.context.ruleRunMetricsStore.incrementNumberOfTriggeredActionsByConnectorType(
        actionTypeId
      );

      const actionGroup = action.group as ActionGroupIds;
      const transformActionParamsOptions: TransformActionParamsOptions = {
        actionsPlugin: this.context.taskRunnerContext.actionsPlugin,
        alertId: this.context.rule.id,
        alertType: this.context.ruleType.id,
        actionTypeId: action.actionTypeId,
        alertName: this.context.rule.name,
        spaceId: this.context.taskInstance.params.spaceId,
        tags: this.context.rule.tags,
        alertInstanceId: alert.getId(),
        alertUuid: alert.getUuid(),
        alertActionGroup: actionGroup,
        alertActionGroupName: this.ruleTypeActionGroups!.get(actionGroup)!,
        context: alert.getContext(),
        actionId: action.id,
        state: alert.getState(),
        kibanaBaseUrl: this.context.taskRunnerContext.kibanaBaseUrl,
        alertParams: this.context.rule.params,
        actionParams: action.params,
        flapping: alert.getFlapping(),
        ruleUrl: ruleUrl?.absoluteUrl,
      };

      if (alert.isAlertAsData()) {
        transformActionParamsOptions.aadAlert = alert.getAlertAsData();
      }

      const actionToRun = {
        ...action,
        params: injectActionParams({
          actionTypeId: action.actionTypeId,
          ruleUrl,
          ruleName: this.context.rule.name,
          actionParams: transformActionParams(transformActionParamsOptions),
        }),
      };

      results.push({
        actionToEnqueue: formatActionToEnqueue({
          action: actionToRun,
          apiKey: this.context.apiKey,
          executionId: this.context.executionId,
          ruleConsumer: this.context.ruleConsumer,
          ruleId: this.context.rule.id,
          ruleTypeId: this.context.ruleType.id,
          spaceId: this.context.taskInstance.params.spaceId,
        }),
        actionToLog: {
          id: action.id,
          // uuid is typed as optional but in reality it is always
          // populated - https://github.com/elastic/kibana/issues/195255
          uuid: action.uuid,
          typeId: action.actionTypeId,
          alertId: alert.getId(),
          alertGroup: action.group,
        },
      });

      if (!this.isRecoveredAction(actionGroup)) {
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

    return results;
  }

  private isExecutableAlert({
    alert,
    action,
    summarizedAlerts,
  }: IsExecutableAlertOpts<ActionGroupIds, RecoveryActionGroupId>) {
    return (
      !this.hasActiveMaintenanceWindow({ alert, action }) &&
      !this.isAlertMuted(alert) &&
      !this.hasPendingCountButNotNotifyOnChange({ alert, action }) &&
      !alert.isFilteredOut(summarizedAlerts)
    );
  }

  private isExecutableActiveAlert({ alert, action }: IsExecutableActiveAlertOpts<ActionGroupIds>) {
    if (!alert.hasScheduledActions()) {
      return false;
    }

    const alertsActionGroup = alert.getScheduledActionOptions()?.actionGroup;

    if (!this.isValidActionGroup(alertsActionGroup as ActionGroupIds)) {
      return false;
    }

    if (action.group !== alertsActionGroup) {
      return false;
    }

    const alertId = alert.getId();
    const {
      context: { rule, logger, ruleLabel },
    } = this;
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

    return true;
  }

  private isRecoveredAction(actionGroup: string) {
    return actionGroup === this.context.ruleType.recoveryActionGroup.id;
  }

  private isAlertMuted(
    alert: Alert<AlertInstanceState, AlertInstanceContext, ActionGroupIds | RecoveryActionGroupId>
  ) {
    const alertId = alert.getId();
    const muted = this.mutedAlertIdsSet.has(alertId);
    if (muted) {
      if (
        !this.skippedAlerts[alertId] ||
        (this.skippedAlerts[alertId] && this.skippedAlerts[alertId].reason !== Reasons.MUTED)
      ) {
        this.context.logger.debug(
          `skipping scheduling of actions for '${alertId}' in rule ${this.context.ruleLabel}: rule is muted`
        );
      }
      this.skippedAlerts[alertId] = { reason: Reasons.MUTED };
      return true;
    }
    return false;
  }

  private isValidActionGroup(actionGroup: ActionGroupIds | RecoveryActionGroupId) {
    if (!this.ruleTypeActionGroups!.has(actionGroup)) {
      this.context.logger.error(
        `Invalid action group "${actionGroup}" for rule "${this.context.ruleType.id}".`
      );
      return false;
    }
    return true;
  }

  private hasActiveMaintenanceWindow({
    alert,
    action,
  }: HelperOpts<ActionGroupIds, RecoveryActionGroupId>) {
    const alertMaintenanceWindowIds = alert.getMaintenanceWindowIds();
    if (alertMaintenanceWindowIds.length !== 0) {
      this.context.logger.debug(
        `no scheduling of summary actions "${action.id}" for rule "${
          this.context.rule.id
        }": has active maintenance windows ${alertMaintenanceWindowIds.join(', ')}.`
      );
      return true;
    }

    return false;
  }

  private addSummarizedAlerts({
    alert,
    summarizedAlerts,
  }: AddSummarizedAlertsOpts<ActionGroupIds, RecoveryActionGroupId>) {
    if (summarizedAlerts) {
      const alertAsData = summarizedAlerts.all.data.find(
        (alertHit: AlertHit) => alertHit._id === alert.getUuid()
      );
      if (alertAsData) {
        alert.setAlertAsData(alertAsData);
      }
    }
  }

  private hasPendingCountButNotNotifyOnChange({
    alert,
    action,
  }: HelperOpts<ActionGroupIds, RecoveryActionGroupId>) {
    // only actions with notifyWhen set to "on status change" should return
    // notifications for flapping pending recovered alerts
    if (
      alert.getPendingRecoveredCount() > 0 &&
      action?.frequency?.notifyWhen !== RuleNotifyWhen.CHANGE
    ) {
      return true;
    }
    return false;
  }
}
