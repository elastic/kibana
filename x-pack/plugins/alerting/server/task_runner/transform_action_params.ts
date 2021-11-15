/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AlertActionParams,
  AlertInstanceState,
  AlertInstanceContext,
  AlertTypeParams,
} from '../types';
import { PluginStartContract as ActionsPluginStartContract } from '../../../actions/server';

export interface AlertMetadata {
  start?: number;
  duration?: number;
  end?: number;
  value?: number;
  threshold?: number;
  reason?: string;
}

interface TransformActionParamsOptions {
  actionsPlugin: ActionsPluginStartContract;
  alertId: string;
  alertType: string;
  actionId: string;
  actionTypeId: string;
  alertName: string;
  alertStart?: number;
  alertDuration?: number;
  alertEnd?: number;
  alertValue?: number;
  alertThreshold?: number;
  alertReason?: string;
  spaceId: string;
  tags?: string[];
  alertInstanceId: string;
  alertActionGroup: string;
  alertActionGroupName: string;
  alertActionSubgroup?: string;
  actionParams: AlertActionParams;
  alertParams: AlertTypeParams;
  state: AlertInstanceState;
  kibanaBaseUrl?: string;
  context: AlertInstanceContext;
  alertMetadata: AlertMetadata;
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
  alertActionGroup,
  alertActionSubgroup,
  alertActionGroupName,
  context,
  actionParams,
  state,
  kibanaBaseUrl,
  alertParams,
  alertMetadata,
}: TransformActionParamsOptions): AlertActionParams {
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
    alertActionSubgroup,
    context,
    date: new Date().toISOString(),
    state,
    kibanaBaseUrl,
    params: alertParams,
    rule: {
      id: alertId,
      name: alertName,
      type: alertType,
      spaceId,
      tags,
    },
    alert: {
      id: alertInstanceId,
      actionGroup: alertActionGroup,
      actionGroupName: alertActionGroupName,
      actionSubgroup: alertActionSubgroup,
      ...(alertMetadata.start ? { start: alertMetadata.start } : {}),
      ...(alertMetadata.duration ? { duration: alertMetadata.duration } : {}),
      ...(alertMetadata.end ? { end: alertMetadata.end } : {}),
      ...(alertMetadata.threshold ? { threshold: alertMetadata.threshold } : {}),
      ...(alertMetadata.value ? { value: alertMetadata.value } : {}),
      ...(alertMetadata.reason ? { reason: alertMetadata.reason } : {}),
    },
  };
  return actionsPlugin.renderActionParameterTemplates(
    actionTypeId,
    actionId,
    actionParams,
    variables
  );
}
