/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertInstanceState, AlertInstanceContext } from '@kbn/alerting-state-types';
import { RuleSystemAction, RuleTypeParams } from '@kbn/alerting-types';
import { RuleTypeState, RuleAlertData } from '../../../../common';
import { GetSummarizedAlertsParams } from '../../../alerts_client/types';
import { getSummarizedAlerts } from '../get_summarized_alerts';
import {
  ActionSchedulerOptions,
  Executable,
  GenerateExecutablesOpts,
  IActionScheduler,
} from '../types';

export class SystemActionScheduler<
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
  private actions: RuleSystemAction[] = [];

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

    // only process system actions when rule type supports summarized alerts
    this.actions = canGetSummarizedAlerts ? context.rule.systemActions ?? [] : [];
  }

  public get priority(): number {
    return 1;
  }

  public async generateExecutables(
    _: GenerateExecutablesOpts<State, Context, ActionGroupIds, RecoveryActionGroupId>
  ): Promise<Array<Executable<State, Context, ActionGroupIds, RecoveryActionGroupId>>> {
    const executables = [];
    for (const action of this.actions) {
      const options: GetSummarizedAlertsParams = {
        spaceId: this.context.taskInstance.params.spaceId,
        ruleId: this.context.taskInstance.params.alertId,
        excludedAlertInstanceIds: this.context.rule.mutedInstanceIds,
        executionUuid: this.context.executionId,
      };

      const summarizedAlerts = await getSummarizedAlerts({
        queryOptions: options,
        alertsClient: this.context.alertsClient,
      });

      if (summarizedAlerts && summarizedAlerts.all.count !== 0) {
        executables.push({ action, summarizedAlerts });
      }
    }

    return executables;
  }
}
