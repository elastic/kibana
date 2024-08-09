/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertInstanceState, AlertInstanceContext } from '@kbn/alerting-state-types';
import { RuleAction, RuleTypeParams } from '@kbn/alerting-types';
import { compact } from 'lodash';
import { RuleTypeState, RuleAlertData, parseDuration } from '../../../../common';
import { GetSummarizedAlertsParams } from '../../../alerts_client/types';
import { getSummarizedAlerts } from '../get_summarized_alerts';
import {
  isActionOnInterval,
  isSummaryAction,
  isSummaryActionThrottled,
  logNumberOfFilteredAlerts,
} from '../rule_action_helper';
import {
  ActionSchedulerOptions,
  Executable,
  GenerateExecutablesOpts,
  IActionScheduler,
} from '../types';

export class SummaryActionScheduler<
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
    const canGetSummarizedAlerts =
      !!context.ruleType.alerts && !!context.alertsClient.getSummarizedAlerts;

    // filter for summary actions where the rule type supports summarized alerts
    this.actions = compact(
      (context.rule.actions ?? [])
        .filter((action) => isSummaryAction(action))
        .map((action) => {
          if (!canGetSummarizedAlerts) {
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
    return 0;
  }

  public async generateExecutables({
    alerts,
    throttledSummaryActions,
  }: GenerateExecutablesOpts<State, Context, ActionGroupIds, RecoveryActionGroupId>): Promise<
    Array<Executable<State, Context, ActionGroupIds, RecoveryActionGroupId>>
  > {
    const executables = [];
    for (const action of this.actions) {
      if (
        // if summary action is throttled, we won't send any notifications
        !isSummaryActionThrottled({ action, throttledSummaryActions, logger: this.context.logger })
      ) {
        const actionHasThrottleInterval = isActionOnInterval(action);
        const optionsBase = {
          spaceId: this.context.taskInstance.params.spaceId,
          ruleId: this.context.taskInstance.params.alertId,
          excludedAlertInstanceIds: this.context.rule.mutedInstanceIds,
          alertsFilter: action.alertsFilter,
        };

        let options: GetSummarizedAlertsParams;
        if (actionHasThrottleInterval) {
          const throttleMills = parseDuration(action.frequency!.throttle!);
          const start = new Date(Date.now() - throttleMills);
          options = { ...optionsBase, start, end: new Date() };
        } else {
          options = { ...optionsBase, executionUuid: this.context.executionId };
        }

        const summarizedAlerts = await getSummarizedAlerts({
          queryOptions: options,
          alertsClient: this.context.alertsClient,
        });

        if (!actionHasThrottleInterval) {
          logNumberOfFilteredAlerts({
            logger: this.context.logger,
            numberOfAlerts: Object.entries(alerts).length,
            numberOfSummarizedAlerts: summarizedAlerts.all.count,
            action,
          });
        }

        if (summarizedAlerts.all.count !== 0) {
          executables.push({ action, summarizedAlerts });
        }
      }
    }

    return executables;
  }
}
