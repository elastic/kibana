/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ActionVariables } from '../../types';
import { ActionVariable } from '../../../../alerting/common';

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
  ruleAlertId = 'rule.alertId',
  ruleAlertActionGroup = 'rule.alertActionGroup',
  ruleAlertActionGroupName = 'rule.alertActionGroupName',
  ruleAlertSubActionGroup = 'rule.alertActionSubGroup',
  spaceId = 'spaceId',
  tags = 'tags',
  date = 'date',
}

export enum LegacyAlertProvidedActionVariables {
  alertId = 'alertId',
  alertName = 'alertName',
  alertInstanceId = 'alertInstanceId',
  alertActionGroup = 'alertActionGroup',
  alertActionGroupName = 'alertActionGroupName',
  alertActionSubGroup = 'alertActionSubGroup',
}

function prefixKeys(actionVariables: ActionVariable[], prefix: string): ActionVariable[] {
  return actionVariables.map((actionVariable) => {
    return { ...actionVariable, name: `${prefix}${actionVariable.name}` };
  });
}

// this list should be the same as in:
//   x-pack/plugins/alerting/server/task_runner/transform_action_params.ts
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
    name: AlertProvidedActionVariables.spaceId,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.spaceIdLabel', {
      defaultMessage: 'The space ID of the rule.',
    }),
  });

  result.push({
    name: AlertProvidedActionVariables.tags,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.tagsLabel', {
      defaultMessage: 'The tags of the rule.',
    }),
  });

  result.push({
    name: AlertProvidedActionVariables.date,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.dateLabel', {
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
      defaultMessage: 'This has been deprecated in favor of {variable}.',
      values: {
        variable: AlertProvidedActionVariables.ruleId,
      },
    }),
  });

  result.push({
    name: LegacyAlertProvidedActionVariables.alertName,
    deprecated: true,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.legacyAlertNameLabel', {
      defaultMessage: 'This has been deprecated in favor of {variable}.',
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
        defaultMessage: 'This has been deprecated in favor of {variable}.',
        values: {
          variable: AlertProvidedActionVariables.ruleAlertId,
        },
      }
    ),
  });

  result.push({
    name: LegacyAlertProvidedActionVariables.alertActionGroup,
    deprecated: true,
    description: i18n.translate(
      'xpack.triggersActionsUI.actionVariables.legacyAlertActionGroupLabel',
      {
        defaultMessage: 'This has been deprecated in favor of {variable}.',
        values: {
          variable: AlertProvidedActionVariables.ruleAlertActionGroup,
        },
      }
    ),
  });

  result.push({
    name: LegacyAlertProvidedActionVariables.alertActionGroupName,
    deprecated: true,
    description: i18n.translate(
      'xpack.triggersActionsUI.actionVariables.legacyAlertActionGroupNameLabel',
      {
        defaultMessage: 'This has been deprecated in favor of {variable}.',
        values: {
          variable: AlertProvidedActionVariables.ruleAlertActionGroupName,
        },
      }
    ),
  });

  result.push({
    name: LegacyAlertProvidedActionVariables.alertActionSubGroup,
    deprecated: true,
    description: i18n.translate(
      'xpack.triggersActionsUI.actionVariables.legacyAlertActionSubGroupLabel',
      {
        defaultMessage: 'This has been deprecated in favor of {variable}.',
        values: {
          variable: AlertProvidedActionVariables.ruleAlertSubActionGroup,
        },
      }
    ),
  });

  return result;
}
