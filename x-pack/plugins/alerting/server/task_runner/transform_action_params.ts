/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import { AADAlert } from '@kbn/alerts-as-data-utils';
import { Logger } from '@kbn/core/server';
import { mapKeys, snakeCase } from 'lodash/fp';
import { executeUserDefinedCode } from '../deno/executor';
import {
  RuleActionParams,
  AlertInstanceState,
  AlertInstanceContext,
  RuleTypeParams,
  SanitizedRule,
} from '../types';

export interface TransformActionParamsOptions {
  logger: Logger;
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
  aadAlert?: AADAlert;
  alertTransform?: string;
  apiKey?: string | null;
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

export async function transformActionParams({
  logger,
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
  aadAlert,
  alertTransform,
  apiKey,
}: TransformActionParamsOptions): Promise<RuleActionParams> {
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
    ...aadAlert,
  };

  const transformedVariables: Record<string, string> = {};
  if (alertTransform) {
    // Run code in child process
    try {
      const { stdout } = await executeUserDefinedCode({
        logger,
        userDefinedCode: alertTransform,
        env: {
          PATH: process.env.PATH,
          ACTION_CONTEXT: JSON.stringify(variables),
          ELASTICSEARCH_API_KEY: apiKey,
        },
      });

      if (stdout) {
        try {
          logger.info(`Info returned from user defined code ${stdout.split('\n')}`);
          const transformedVars: string[] = getTransformedVariables(stdout);
          for (const varStr of transformedVars) {
            const transformedVar: { key: string; value: string } = JSON.parse(varStr);
            transformedVariables[transformedVar.key] = transformedVar.value;
          }
        } catch (err) {
          logger.error(`couldn't parse the output from the alert transform`);
        }
      }
    } catch (error) {
      logger.error(`Error executing user-defined code - ${error.message}`);
      throw error;
    }
  }

  const allVariables = { ...variables, ...transformedVariables };

  return actionsPlugin.renderActionParameterTemplates(
    actionTypeId,
    actionId,
    actionParams,
    allVariables
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
    alertId: rule.id,
    alertName: rule.name,
    spaceId,
    tags: rule.tags,
    params: rule.params,
    alertInstanceId: rule.id,
    alertActionGroup: 'default',
    alertActionGroupName: 'Default',
    alert: {
      id: rule.id,
      uuid: rule.id,
      actionGroup: 'default',
      actionGroupName: 'Default',
      flapping: false,
    },
    kibanaBaseUrl,
    date: new Date().toISOString(),
    // For backwards compatibility with security solutions rules
    context: {
      alerts: alerts.all.data ?? [],
      results_link: ruleUrl,
      rule: mapKeys(snakeCase, {
        ...rule.params,
        name: rule.name,
        id: rule.id,
      }),
    },
    state: {
      signals_count: alerts.all.count ?? 0,
    },
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

const newContextPrefix = 'newContextToAdd:';
function getTransformedVariables(output: string) {
  return output
    .split('\n')
    .filter((str) => str.indexOf(newContextPrefix) === 0)
    .map((str) => str.substring(newContextPrefix.length));
}
