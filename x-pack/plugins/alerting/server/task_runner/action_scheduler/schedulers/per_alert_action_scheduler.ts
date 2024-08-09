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
import { getSummarizedAlerts } from '../get_summarized_alerts';
import {
  generateActionHash,
  isActionOnInterval,
  isSummaryAction,
  logNumberOfFilteredAlerts,
} from '../rule_action_helper';
import {
  ActionSchedulerOptions,
  Executable,
  GenerateExecutablesOpts,
  IActionScheduler,
} from '../types';

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

  public async generateExecutables({
    alerts,
  }: GenerateExecutablesOpts<State, Context, ActionGroupIds, RecoveryActionGroupId>): Promise<
    Array<Executable<State, Context, ActionGroupIds, RecoveryActionGroupId>>
  > {
    const executables = [];

    const alertsArray = Object.entries(alerts);
    for (const action of this.actions) {
      let summarizedAlerts = null;

      if (action.useAlertDataForTemplate || action.alertsFilter) {
        const optionsBase = {
          spaceId: this.context.taskInstance.params.spaceId,
          ruleId: this.context.taskInstance.params.alertId,
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
          numberOfAlerts: Object.entries(alerts).length,
          numberOfSummarizedAlerts: summarizedAlerts.all.count,
          action,
        });
      }

      for (const [alertId, alert] of alertsArray) {
        const alertMaintenanceWindowIds = alert.getMaintenanceWindowIds();
        if (alertMaintenanceWindowIds.length !== 0) {
          this.context.logger.debug(
            `no scheduling of summary actions "${action.id}" for rule "${
              this.context.taskInstance.params.alertId
            }": has active maintenance windows ${alertMaintenanceWindowIds.join(', ')}.`
          );
          continue;
        }

        if (alert.isFilteredOut(summarizedAlerts)) {
          continue;
        }

        const actionGroup =
          alert.getScheduledActionOptions()?.actionGroup ||
          this.context.ruleType.recoveryActionGroup.id;

        if (!this.ruleTypeActionGroups!.has(actionGroup)) {
          this.context.logger.error(
            `Invalid action group "${actionGroup}" for rule "${this.context.ruleType.id}".`
          );
          continue;
        }

        // only actions with notifyWhen set to "on status change" should return
        // notifications for flapping pending recovered alerts
        if (
          alert.getPendingRecoveredCount() > 0 &&
          action?.frequency?.notifyWhen !== RuleNotifyWhen.CHANGE
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

  private isAlertMuted(alertId: string) {
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

  private isExecutableActiveAlert({
    alert,
    action,
  }: {
    alert: Alert<AlertInstanceState, AlertInstanceContext, ActionGroupIds | RecoveryActionGroupId>;
    action: RuleAction;
  }) {
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

    return alert.hasScheduledActions();
  }

  private isRecoveredAlert(actionGroup: string) {
    return actionGroup === this.context.ruleType.recoveryActionGroup.id;
  }
}
