/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ActionVariables } from '../../types';
import { ActionVariable } from '../../../../alerts/common';

// return a "flattened" list of action variables for an alertType
export function transformActionVariables(actionVariables: ActionVariables): ActionVariable[] {
  const alwaysProvidedVars = getAlwaysProvidedActionVariables();
  const contextVars = actionVariables.context
    ? prefixKeys(actionVariables.context, 'context.')
    : [];
  const paramsVars = prefixKeys(actionVariables.params, 'params.');
  const stateVars = prefixKeys(actionVariables.state, 'state.');

  return alwaysProvidedVars.concat(contextVars, paramsVars, stateVars);
}

export enum AlertProvidedActionVariables {
  ruleId = 'rule.id',
  ruleName = 'rule.name',
  ruleSpaceId = 'rule.spaceId',
  ruleTags = 'rule.tags',
  ruleDate = 'rule.date',
  ruleAlertId = 'rule.alertId',
  ruleAlertActionGroup = 'rule.alertActionGroup',
  ruleAlertActionGroupName = 'rule.alertActionGroupName',
  ruleAlertSubActionGroup = 'rule.alertActionSubGroup',
}

export enum LegacyAlertProvidedActionVariables {
  alertId = 'alertId',
  alertName = 'alertName',
  alertInstanceId = 'alertInstanceId',
}

function prefixKeys(actionVariables: ActionVariable[], prefix: string): ActionVariable[] {
  return actionVariables.map((actionVariable) => {
    return { ...actionVariable, name: `${prefix}${actionVariable.name}` };
  });
}

// this list should be the same as in:
//   x-pack/plugins/alerts/server/task_runner/transform_action_params.ts
function getAlwaysProvidedActionVariables(): ActionVariable[] {
  const result: ActionVariable[] = [];

  result.push({
    name: AlertProvidedActionVariables.ruleId,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.ruleIdLabel', {
      defaultMessage: 'The ID of the rule.',
    }),
  });

  result.push({
    name: AlertProvidedActionVariables.ruleName,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.ruleNameLabel', {
      defaultMessage: 'The name of the rule.',
    }),
  });

  result.push({
    name: AlertProvidedActionVariables.ruleSpaceId,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.ruleSpaceIdLabel', {
      defaultMessage: 'The space ID of the rule.',
    }),
  });

  result.push({
    name: AlertProvidedActionVariables.ruleTags,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.ruleTagsLabel', {
      defaultMessage: 'The tags of the rule.',
    }),
  });

  result.push({
    name: AlertProvidedActionVariables.ruleDate,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.ruleDateLabel', {
      defaultMessage: 'The date the rule scheduled the action.',
    }),
  });

  result.push({
    name: AlertProvidedActionVariables.ruleAlertId,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.ruleAlertIdLabel', {
      defaultMessage: 'The ID of the alert that scheduled actions for the rule.',
    }),
  });

  result.push({
    name: AlertProvidedActionVariables.ruleAlertActionGroup,
    description: i18n.translate(
      'xpack.triggersActionsUI.actionVariables.ruleAlertActionGroupLabel',
      {
        defaultMessage: 'The action group of the alert that scheduled actions for the rule.',
      }
    ),
  });

  result.push({
    name: AlertProvidedActionVariables.ruleAlertSubActionGroup,
    description: i18n.translate(
      'xpack.triggersActionsUI.actionVariables.ruleAlertSubActionGroupLabel',
      {
        defaultMessage: 'The action subgroup of the alert that scheduled actions for the rule.',
      }
    ),
  });

  result.push({
    name: AlertProvidedActionVariables.ruleAlertActionGroupName,
    description: i18n.translate(
      'xpack.triggersActionsUI.actionVariables.ruleAlertActionGroupNameLabel',
      {
        defaultMessage:
          'The human readable name of the action group of the alert that scheduled actions for the rule.',
      }
    ),
  });

  result.push({
    name: 'kibanaBaseUrl',
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.kibanaBaseUrlLabel', {
      defaultMessage:
        'The configured server.publicBaseUrl value or empty string if not configured.',
    }),
  });

  result.push({
    name: LegacyAlertProvidedActionVariables.alertId,
    deprecated: true,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.legacyAlertIdLabel', {
      defaultMessage: 'This variable has been deprecated in favor of {variable}.',
      values: {
        variable: AlertProvidedActionVariables.ruleId,
      },
    }),
  });

  result.push({
    name: LegacyAlertProvidedActionVariables.alertName,
    deprecated: true,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.legacyAlertNameLabel', {
      defaultMessage: 'This variable has been deprecated in favor of {variable}.',
      values: {
        variable: AlertProvidedActionVariables.ruleName,
      },
    }),
  });

  result.push({
    name: LegacyAlertProvidedActionVariables.alertInstanceId,
    deprecated: true,
    description: i18n.translate(
      'xpack.triggersActionsUI.actionVariables.legacyAlertInstanceIdLabel',
      {
        defaultMessage: 'This variable has been deprecated in favor of {variable}.',
        values: {
          variable: AlertProvidedActionVariables.ruleAlertId,
        },
      }
    ),
  });

  return result;
}
