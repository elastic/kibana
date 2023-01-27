/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import {
  RuleActionParams,
  AlertInstanceState,
  AlertInstanceContext,
  RuleTypeParams,
  SanitizedRule,
} from '../types';

interface TransformActionParamsOptions {
  actionsPlugin: ActionsPluginStartContract;
  alertId: string;
  alertType: string;
  actionId: string;
  actionTypeId: string;
  alertName: string;
  spaceId: string;
  tags?: string[];
  alertInstanceId: string;
  alertUuid: string;
  alertActionGroup: string;
  alertActionGroupName: string;
  actionParams: RuleActionParams;
  alertParams: RuleTypeParams;
  state: AlertInstanceState;
  kibanaBaseUrl?: string;
  context: AlertInstanceContext;
  ruleUrl?: string;
  flapping: boolean;
}

interface SummarizedAlertsWithAll {
  new: {
    count: number;
    data: unknown[];
  };
  ongoing: {
    count: number;
    data: unknown[];
  };
  recovered: {
    count: number;
    data: unknown[];
  };
  all: {
    count: number;
    data: unknown[];
  };
}

export function transformActionParams({
  actionsPlugin,
  alertId,
  alertType,
  actionId,
  actionTypeId,
  alertName,
  spaceId,
  tags,
  alertInstanceId,
  alertUuid,
  alertActionGroup,
  alertActionGroupName,
  context,
  actionParams,
  state,
  kibanaBaseUrl,
  alertParams,
  ruleUrl,
  flapping,
}: TransformActionParamsOptions): RuleActionParams {
  // when the list of variables we pass in here changes,
  // the UI will need to be updated as well; see:
  // x-pack/plugins/triggers_actions_ui/public/application/lib/action_variables.ts
  const variables = {
    alertId,
    alertName,
    spaceId,
    tags,
    alertInstanceId,
    alertActionGroup,
    alertActionGroupName,
    context,
    date: new Date().toISOString(),
    state,
    kibanaBaseUrl,
    params: alertParams,
    rule: {
      params: alertParams,
      id: alertId,
      name: alertName,
      type: alertType,
      spaceId,
      tags,
      url: ruleUrl,
    },
    alert: {
      id: alertInstanceId,
      uuid: alertUuid,
      actionGroup: alertActionGroup,
      actionGroupName: alertActionGroupName,
      flapping,
    },
  };
  return actionsPlugin.renderActionParameterTemplates(
    actionTypeId,
    actionId,
    actionParams,
    variables
  );
}

export function transformSummaryActionParams({
  alerts,
  rule,
  ruleTypeId,
  actionsPlugin,
  actionId,
  actionTypeId,
  spaceId,
  actionParams,
  ruleUrl,
  kibanaBaseUrl,
}: {
  alerts: SummarizedAlertsWithAll;
  rule: SanitizedRule<RuleTypeParams>;
  ruleTypeId: string;
  actionsPlugin: ActionsPluginStartContract;
  actionId: string;
  actionTypeId: string;
  spaceId: string;
  actionParams: RuleActionParams;
  kibanaBaseUrl?: string;
  ruleUrl?: string;
}): RuleActionParams {
  const variables = {
    kibanaBaseUrl,
    date: new Date().toISOString(),
    rule: {
      params: rule.params,
      id: rule.id,
      name: rule.name,
      type: ruleTypeId,
      url: ruleUrl,
      tags: rule.tags,
      spaceId,
    },
    alerts,
  };
  return actionsPlugin.renderActionParameterTemplates(
    actionTypeId,
    actionId,
    actionParams,
    variables
  );
}
