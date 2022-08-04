/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import { Alert } from '../alert';
import {
  RuleActionParams,
  AlertInstanceState,
  AlertInstanceContext,
  RuleTypeParams,
  SanitizedRule,
  RuleAction,
} from '../types';

interface TransformActionParamsOptions<
  Params extends RuleTypeParams,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string
> {
  rule: SanitizedRule<Params>;
  alert: Alert<State, Context, ActionGroupIds>;
  action: RuleAction;
  actionsPlugin: ActionsPluginStartContract;
  actionTypeId: string;
  kibanaBaseUrl?: string;
  spaceId: string;
  ruleType: string;
  alertActionGroup: string;
  alertActionGroupName: string;
  alertActionSubgroup?: string;
}

interface TransformSummaryActionParamsOptions<
  Params extends RuleTypeParams,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  rule: SanitizedRule<Params>;
  alerts: {
    new: Array<Alert<State, Context, ActionGroupIds>>;
    ongoing: Array<Alert<State, Context, ActionGroupIds>>;
    recovered: Array<Alert<State, Context, RecoveryActionGroupId>>;
    // old?: '';
  };
  action: RuleAction;
  actionsPlugin: ActionsPluginStartContract;
  actionTypeId: string;
  kibanaBaseUrl?: string;
  spaceId: string;
  ruleType: string;
}

export function transformActionParams<
  Params extends RuleTypeParams,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string
>({
  rule,
  alert,
  action,
  actionsPlugin,
  actionTypeId,
  kibanaBaseUrl,
  spaceId,
  ruleType,
  alertActionGroup,
  alertActionGroupName,
  alertActionSubgroup,
}: TransformActionParamsOptions<Params, State, Context, ActionGroupIds>): RuleActionParams {
  // when the list of variables we pass in here changes,
  // the UI will need to be updated as well; see:
  // x-pack/plugins/triggers_actions_ui/public/application/lib/action_variables.ts
  const variables = {
    context: alert.getContext(),
    date: new Date().toISOString(),
    state: alert.getState(),
    kibanaBaseUrl,
    params: rule.params,
    rule: {
      id: rule.id,
      name: rule.name,
      type: ruleType,
      spaceId,
      tags: rule.tags,
    },
    alert: {
      id: alert.getId(),
      actionGroup: alertActionGroup,
      actionGroupName: alertActionGroupName,
      actionSubgroup: alertActionSubgroup,
    },
  };
  return actionsPlugin.renderActionParameterTemplates(
    actionTypeId,
    action.id,
    action.params,
    variables
  );
}

export function transformSummarizedActionParams<
  Params extends RuleTypeParams,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>({
  rule,
  alerts,
  action,
  actionsPlugin,
  actionTypeId,
  kibanaBaseUrl,
  spaceId,
  ruleType,
}: TransformSummaryActionParamsOptions<
  Params,
  State,
  Context,
  ActionGroupIds,
  RecoveryActionGroupId
>): RuleActionParams {
  const variables = {
    date: new Date().toISOString(),
    kibanaBaseUrl,
    params: rule.params,
    rule: {
      id: rule.id,
      name: rule.name,
      type: ruleType,
      spaceId,
      tags: rule.tags,
    },
    alerts,
  };
  return actionsPlugin.renderActionParameterTemplates(
    actionTypeId,
    action.id,
    action.params,
    variables
  );
}
