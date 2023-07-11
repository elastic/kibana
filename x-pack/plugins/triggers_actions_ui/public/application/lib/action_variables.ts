/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { pick } from 'lodash';
import { ActionVariable } from '@kbn/alerting-plugin/common';
import { ActionVariables, REQUIRED_ACTION_VARIABLES, CONTEXT_ACTION_VARIABLES } from '../../types';

export type OmitMessageVariablesType = 'all' | 'keepContext';

function transformProvidedActionVariables(
  actionVariables?: ActionVariables,
  omitMessageVariables?: OmitMessageVariablesType
): ActionVariable[] {
  if (!actionVariables) {
    return [];
  }

  const filteredActionVariables: ActionVariables = omitMessageVariables
    ? omitMessageVariables === 'all'
      ? pick(actionVariables, REQUIRED_ACTION_VARIABLES)
      : pick(actionVariables, [...REQUIRED_ACTION_VARIABLES, ...CONTEXT_ACTION_VARIABLES])
    : actionVariables;

  const paramsVars = prefixKeys(filteredActionVariables.params, 'params.');
  const contextVars = filteredActionVariables.context
    ? prefixKeys(filteredActionVariables.context, 'context.')
    : [];
  const stateVars = filteredActionVariables.state
    ? prefixKeys(filteredActionVariables.state, 'state.')
    : [];

  return contextVars.concat(paramsVars, stateVars);
}

// return a "flattened" list of action variables for an alertType
export function transformActionVariables(
  actionVariables: ActionVariables,
  summaryActionVariables?: ActionVariables,
  omitMessageVariables?: OmitMessageVariablesType,
  isSummaryAction?: boolean
): ActionVariable[] {
  if (isSummaryAction) {
    const alwaysProvidedVars = getSummaryAlertActionVariables();
    const transformedActionVars = transformProvidedActionVariables(
      summaryActionVariables,
      omitMessageVariables
    );
    return alwaysProvidedVars.concat(transformedActionVars);
  }

  const alwaysProvidedVars = getAlwaysProvidedActionVariables();
  const transformedActionVars = transformProvidedActionVariables(
    actionVariables,
    omitMessageVariables
  );
  return alwaysProvidedVars.concat(transformedActionVars);
}

export enum AlertProvidedActionVariables {
  ruleId = 'rule.id',
  ruleName = 'rule.name',
  ruleSpaceId = 'rule.spaceId',
  ruleTags = 'rule.tags',
  ruleType = 'rule.type',
  ruleUrl = 'rule.url',
  date = 'date',
  alertId = 'alert.id',
  alertActionGroup = 'alert.actionGroup',
  alertActionGroupName = 'alert.actionGroupName',
  alertActionSubgroup = 'alert.actionSubgroup',
  alertFlapping = 'alert.flapping',
  kibanaBaseUrl = 'kibanaBaseUrl',
}

export enum LegacyAlertProvidedActionVariables {
  alertId = 'alertId',
  alertName = 'alertName',
  alertInstanceId = 'alertInstanceId',
  alertActionGroup = 'alertActionGroup',
  alertActionGroupName = 'alertActionGroupName',
  alertActionSubgroup = 'alertActionSubgroup',
  tags = 'tags',
  spaceId = 'spaceId',
}

export enum SummaryAlertProvidedActionVariables {
  ruleParams = 'rule.params',
  newAlertsCount = 'alerts.new.count',
  newAlertsData = 'alerts.new.data',
  ongoingAlertsCount = 'alerts.ongoing.count',
  ongoingAlertsData = 'alerts.ongoing.data',
  recoveredAlertsCount = 'alerts.recovered.count',
  recoveredAlertsData = 'alerts.recovered.data',
  allAlertsCount = 'alerts.all.count',
  allAlertsData = 'alerts.all.data',
}

const AlertProvidedActionVariableDescriptions = {
  [AlertProvidedActionVariables.ruleId]: {
    name: AlertProvidedActionVariables.ruleId,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.ruleIdLabel', {
      defaultMessage: 'The ID of the rule.',
    }),
  },
  [AlertProvidedActionVariables.ruleName]: {
    name: AlertProvidedActionVariables.ruleName,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.ruleNameLabel', {
      defaultMessage: 'The name of the rule.',
    }),
  },
  [AlertProvidedActionVariables.ruleSpaceId]: {
    name: AlertProvidedActionVariables.ruleSpaceId,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.ruleSpaceIdLabel', {
      defaultMessage: 'The space ID of the rule.',
    }),
  },
  [AlertProvidedActionVariables.ruleTags]: {
    name: AlertProvidedActionVariables.ruleTags,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.ruleTagsLabel', {
      defaultMessage: 'The tags of the rule.',
    }),
  },
  [AlertProvidedActionVariables.ruleType]: {
    name: AlertProvidedActionVariables.ruleType,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.ruleTypeLabel', {
      defaultMessage: 'The type of rule.',
    }),
  },
  [AlertProvidedActionVariables.ruleUrl]: {
    name: AlertProvidedActionVariables.ruleUrl,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.ruleUrlLabel', {
      defaultMessage:
        'The URL to the rule that generated the alert. This will be an empty string if the server.publicBaseUrl is not configured.',
    }),
    usesPublicBaseUrl: true,
  },
  [AlertProvidedActionVariables.date]: {
    name: AlertProvidedActionVariables.date,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.dateLabel', {
      defaultMessage: 'The date the rule scheduled the action.',
    }),
  },
  [AlertProvidedActionVariables.kibanaBaseUrl]: {
    name: AlertProvidedActionVariables.kibanaBaseUrl,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.kibanaBaseUrlLabel', {
      defaultMessage:
        'The configured server.publicBaseUrl value or empty string if not configured.',
    }),
  },
};

function prefixKeys(actionVariables: ActionVariable[], prefix: string): ActionVariable[] {
  return actionVariables.map((actionVariable) => {
    return { ...actionVariable, name: `${prefix}${actionVariable.name}` };
  });
}

// this list should be the same as in:
//   x-pack/plugins/alerting/server/task_runner/transform_action_params.ts
function getAlwaysProvidedActionVariables(): ActionVariable[] {
  const result: ActionVariable[] = [];

  result.push(AlertProvidedActionVariableDescriptions[AlertProvidedActionVariables.ruleId]);

  result.push(AlertProvidedActionVariableDescriptions[AlertProvidedActionVariables.ruleName]);

  result.push(AlertProvidedActionVariableDescriptions[AlertProvidedActionVariables.ruleSpaceId]);

  result.push(AlertProvidedActionVariableDescriptions[AlertProvidedActionVariables.ruleTags]);

  result.push(AlertProvidedActionVariableDescriptions[AlertProvidedActionVariables.ruleType]);

  result.push(AlertProvidedActionVariableDescriptions[AlertProvidedActionVariables.ruleUrl]);

  result.push(AlertProvidedActionVariableDescriptions[AlertProvidedActionVariables.date]);

  result.push({
    name: AlertProvidedActionVariables.alertId,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.alertIdLabel', {
      defaultMessage: 'The ID of the alert that scheduled actions for the rule.',
    }),
  });

  result.push({
    name: AlertProvidedActionVariables.alertActionGroup,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.alertActionGroupLabel', {
      defaultMessage: 'The action group of the alert that scheduled actions for the rule.',
    }),
  });

  result.push({
    name: AlertProvidedActionVariables.alertActionSubgroup,
    description: i18n.translate(
      'xpack.triggersActionsUI.actionVariables.alertActionSubgroupLabel',
      {
        defaultMessage: 'The action subgroup of the alert that scheduled actions for the rule.',
      }
    ),
  });

  result.push({
    name: AlertProvidedActionVariables.alertActionGroupName,
    description: i18n.translate(
      'xpack.triggersActionsUI.actionVariables.alertActionGroupNameLabel',
      {
        defaultMessage:
          'The human readable name of the action group of the alert that scheduled actions for the rule.',
      }
    ),
  });

  result.push({
    name: AlertProvidedActionVariables.alertFlapping,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.alertFlappingLabel', {
      defaultMessage:
        'A flag on the alert that indicates whether the alert status is changing repeatedly.',
    }),
  });

  result.push(AlertProvidedActionVariableDescriptions[AlertProvidedActionVariables.kibanaBaseUrl]);

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
          variable: AlertProvidedActionVariables.alertId,
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
          variable: AlertProvidedActionVariables.alertActionGroup,
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
          variable: AlertProvidedActionVariables.alertActionGroupName,
        },
      }
    ),
  });

  result.push({
    name: LegacyAlertProvidedActionVariables.alertActionSubgroup,
    deprecated: true,
    description: i18n.translate(
      'xpack.triggersActionsUI.actionVariables.legacyAlertActionSubGroupLabel',
      {
        defaultMessage: 'This has been deprecated in favor of {variable}.',
        values: {
          variable: AlertProvidedActionVariables.alertActionSubgroup,
        },
      }
    ),
  });

  result.push({
    name: LegacyAlertProvidedActionVariables.spaceId,
    deprecated: true,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.legacySpaceIdLabel', {
      defaultMessage: 'This has been deprecated in favor of {variable}.',
      values: {
        variable: AlertProvidedActionVariables.ruleSpaceId,
      },
    }),
  });

  result.push({
    name: LegacyAlertProvidedActionVariables.tags,
    deprecated: true,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.legacyTagsLabel', {
      defaultMessage: 'This has been deprecated in favor of {variable}.',
      values: {
        variable: AlertProvidedActionVariables.ruleTags,
      },
    }),
  });

  return result;
}
function getSummaryAlertActionVariables(): ActionVariable[] {
  const result: ActionVariable[] = [];
  result.push(AlertProvidedActionVariableDescriptions[AlertProvidedActionVariables.kibanaBaseUrl]);

  result.push(AlertProvidedActionVariableDescriptions[AlertProvidedActionVariables.date]);

  result.push({
    name: SummaryAlertProvidedActionVariables.ruleParams,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.ruleParamsLabel', {
      defaultMessage: 'The params of the rule.',
    }),
  });

  result.push(AlertProvidedActionVariableDescriptions[AlertProvidedActionVariables.ruleId]);

  result.push(AlertProvidedActionVariableDescriptions[AlertProvidedActionVariables.ruleName]);

  result.push(AlertProvidedActionVariableDescriptions[AlertProvidedActionVariables.ruleType]);

  result.push(AlertProvidedActionVariableDescriptions[AlertProvidedActionVariables.ruleUrl]);

  result.push(AlertProvidedActionVariableDescriptions[AlertProvidedActionVariables.ruleTags]);

  result.push(AlertProvidedActionVariableDescriptions[AlertProvidedActionVariables.ruleSpaceId]);

  result.push({
    name: SummaryAlertProvidedActionVariables.newAlertsCount,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.newAlertsCountLabel', {
      defaultMessage: 'The count of new alerts.',
    }),
  });
  result.push({
    name: SummaryAlertProvidedActionVariables.newAlertsData,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.newAlertsDataLabel', {
      defaultMessage: 'An array of objects for new alerts.',
    }),
  });
  result.push({
    name: SummaryAlertProvidedActionVariables.ongoingAlertsCount,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.ongoingAlertsCountLabel', {
      defaultMessage: 'The count of ongoing alerts.',
    }),
  });
  result.push({
    name: SummaryAlertProvidedActionVariables.ongoingAlertsData,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.ongoingAlertsDataLabel', {
      defaultMessage: 'An array of objects for ongoing alerts.',
    }),
  });
  result.push({
    name: SummaryAlertProvidedActionVariables.recoveredAlertsCount,
    description: i18n.translate(
      'xpack.triggersActionsUI.actionVariables.recoveredAlertsCountLabel',
      {
        defaultMessage: 'The count of recovered alerts.',
      }
    ),
  });
  result.push({
    name: SummaryAlertProvidedActionVariables.recoveredAlertsData,
    description: i18n.translate(
      'xpack.triggersActionsUI.actionVariables.recoveredAlertsDataLabel',
      {
        defaultMessage: 'An array of objects for recovered alerts.',
      }
    ),
  });
  result.push({
    name: SummaryAlertProvidedActionVariables.allAlertsCount,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.allAlertsCountLabel', {
      defaultMessage: 'The count of all alerts.',
    }),
  });
  result.push({
    name: SummaryAlertProvidedActionVariables.allAlertsData,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.allAlertsDataLabel', {
      defaultMessage: 'An array of objects for all alerts.',
    }),
  });

  return result;
}
