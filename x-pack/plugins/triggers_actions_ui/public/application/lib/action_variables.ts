/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { map, pick } from 'lodash';
import { ActionVariable } from '@kbn/alerting-plugin/common';
import { ActionVariables, REQUIRED_ACTION_VARIABLES, CONTEXT_ACTION_VARIABLES } from '../../types';

export type OmitMessageVariablesType = 'all' | 'keepContext';

// return a "flattened" list of action variables for an alertType
export function transformActionVariables(
  actionVariables: ActionVariables,
  omitMessageVariables?: OmitMessageVariablesType,
  isSummaryAction?: boolean
): ActionVariable[] {
  if (isSummaryAction) {
    return getSummaryAlertActionVariables();
  }

  const filteredActionVariables: ActionVariables = omitMessageVariables
    ? omitMessageVariables === 'all'
      ? pick(actionVariables, REQUIRED_ACTION_VARIABLES)
      : pick(actionVariables, [...REQUIRED_ACTION_VARIABLES, ...CONTEXT_ACTION_VARIABLES])
    : actionVariables;

  const alwaysProvidedVars = getAlwaysProvidedActionVariables();
  const paramsVars = prefixKeys(filteredActionVariables.params, 'params.');
  const contextVars = filteredActionVariables.context
    ? prefixKeys(filteredActionVariables.context, 'context.')
    : [];
  const stateVars = filteredActionVariables.state
    ? prefixKeys(filteredActionVariables.state, 'state.')
    : [];

  return alwaysProvidedVars.concat(contextVars, paramsVars, stateVars);
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
  kibanaBaseUrl = 'kibanaBaseUrl',
  date = 'date',
  ruleParams = 'rule.params',
  ruleId = 'rule.id',
  ruleName = 'rule.name',
  ruleType = 'rule.type',
  ruleUrl = 'rule.url',
  ruleTags = 'rule.tags',
  ruleSpaceId = 'rule.spaceId',
  newAlertsCount = 'alerts.new.count',
  newAlertsData = 'alerts.new.data',
  ongoingAlertsCount = 'alerts.ongoing.count',
  ongoingAlertsData = 'alerts.ongoing.data',
  recoveredAlertsCount = 'alerts.recovered.count',
  recoveredAlertsData = 'alerts.recovered.data',
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
        'The URL to the Stack Management rule page that generated the alert. This will be an empty string if the server.publicBaseUrl is not configured.',
    }),
  },
  [AlertProvidedActionVariables.date]: {
    name: AlertProvidedActionVariables.date,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.dateLabel', {
      defaultMessage: 'The date the rule scheduled the action.',
    }),
  },
  [AlertProvidedActionVariables.alertId]: {
    name: AlertProvidedActionVariables.alertId,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.alertIdLabel', {
      defaultMessage: 'The ID of the alert that scheduled actions for the rule.',
    }),
  },
  [AlertProvidedActionVariables.alertActionGroup]: {
    name: AlertProvidedActionVariables.alertActionGroup,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.alertActionGroupLabel', {
      defaultMessage: 'The action group of the alert that scheduled actions for the rule.',
    }),
  },
  [AlertProvidedActionVariables.alertActionSubgroup]: {
    name: AlertProvidedActionVariables.alertActionSubgroup,
    description: i18n.translate(
      'xpack.triggersActionsUI.actionVariables.alertActionSubgroupLabel',
      {
        defaultMessage: 'The action subgroup of the alert that scheduled actions for the rule.',
      }
    ),
  },
  [AlertProvidedActionVariables.alertActionGroupName]: {
    name: AlertProvidedActionVariables.alertActionGroupName,
    description: i18n.translate(
      'xpack.triggersActionsUI.actionVariables.alertActionGroupNameLabel',
      {
        defaultMessage:
          'The human readable name of the action group of the alert that scheduled actions for the rule.',
      }
    ),
  },
  [AlertProvidedActionVariables.alertFlapping]: {
    name: AlertProvidedActionVariables.alertFlapping,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.alertFlappingLabel', {
      defaultMessage:
        'A flag on the alert that indicates whether the alert status is changing repeatedly.',
    }),
  },
  [AlertProvidedActionVariables.kibanaBaseUrl]: {
    name: AlertProvidedActionVariables.kibanaBaseUrl,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.kibanaBaseUrlLabel', {
      defaultMessage:
        'The configured server.publicBaseUrl value or empty string if not configured.',
    }),
  },
  [LegacyAlertProvidedActionVariables.alertId]: {
    name: LegacyAlertProvidedActionVariables.alertId,
    deprecated: true,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.legacyAlertIdLabel', {
      defaultMessage: 'This has been deprecated in favor of {variable}.',
      values: {
        variable: AlertProvidedActionVariables.ruleId,
      },
    }),
  },
  [LegacyAlertProvidedActionVariables.alertName]: {
    name: LegacyAlertProvidedActionVariables.alertName,
    deprecated: true,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.legacyAlertNameLabel', {
      defaultMessage: 'This has been deprecated in favor of {variable}.',
      values: {
        variable: AlertProvidedActionVariables.ruleName,
      },
    }),
  },
  [LegacyAlertProvidedActionVariables.alertInstanceId]: {
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
  },
  [LegacyAlertProvidedActionVariables.alertActionGroup]: {
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
  },
  [LegacyAlertProvidedActionVariables.alertActionGroupName]: {
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
  },
  [LegacyAlertProvidedActionVariables.alertActionSubgroup]: {
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
  },
  [LegacyAlertProvidedActionVariables.spaceId]: {
    name: LegacyAlertProvidedActionVariables.spaceId,
    deprecated: true,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.legacySpaceIdLabel', {
      defaultMessage: 'This has been deprecated in favor of {variable}.',
      values: {
        variable: AlertProvidedActionVariables.ruleSpaceId,
      },
    }),
  },
  [LegacyAlertProvidedActionVariables.tags]: {
    name: LegacyAlertProvidedActionVariables.tags,
    deprecated: true,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.legacyTagsLabel', {
      defaultMessage: 'This has been deprecated in favor of {variable}.',
      values: {
        variable: AlertProvidedActionVariables.ruleTags,
      },
    }),
  },
  [SummaryAlertProvidedActionVariables.ruleParams]: {
    name: SummaryAlertProvidedActionVariables.ruleParams,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.ruleParamsLabel', {
      defaultMessage: 'The params of the rule.',
    }),
  },
  [SummaryAlertProvidedActionVariables.newAlertsCount]: {
    name: SummaryAlertProvidedActionVariables.newAlertsCount,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.newAlertsCountLabel', {
      defaultMessage: 'The number of new alerts.',
    }),
  },
  [SummaryAlertProvidedActionVariables.newAlertsData]: {
    name: SummaryAlertProvidedActionVariables.newAlertsData,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.newAlertsDataLabel', {
      defaultMessage: 'The data for new alerts.',
    }),
  },
  [SummaryAlertProvidedActionVariables.ongoingAlertsCount]: {
    name: SummaryAlertProvidedActionVariables.ongoingAlertsCount,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.ongoingAlertsCountLabel', {
      defaultMessage: 'The number of ongoing alerts..',
    }),
  },
  [SummaryAlertProvidedActionVariables.ongoingAlertsData]: {
    name: SummaryAlertProvidedActionVariables.ongoingAlertsData,
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.ongoingAlertsDataLabel', {
      defaultMessage: 'The data for ongoing alerts.',
    }),
  },
  [SummaryAlertProvidedActionVariables.recoveredAlertsCount]: {
    name: SummaryAlertProvidedActionVariables.recoveredAlertsCount,
    description: i18n.translate(
      'xpack.triggersActionsUI.actionVariables.recoveredAlertsCountLabel',
      {
        defaultMessage: 'The number of recovered alerts..',
      }
    ),
  },
  [SummaryAlertProvidedActionVariables.recoveredAlertsData]: {
    name: SummaryAlertProvidedActionVariables.recoveredAlertsData,
    description: i18n.translate(
      'xpack.triggersActionsUI.actionVariables.recoveredAlertsDataLabel',
      {
        defaultMessage: 'The data for recovered alerts.',
      }
    ),
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
  const providedActionVariables: ActionVariable[] = map(
    AlertProvidedActionVariables,
    (v) => AlertProvidedActionVariableDescriptions[v]
  );
  const legacyActionVariables: ActionVariable[] = map(
    LegacyAlertProvidedActionVariables,
    (v) => AlertProvidedActionVariableDescriptions[v]
  );

  return providedActionVariables.concat(legacyActionVariables);
}

function getSummaryAlertActionVariables(): ActionVariable[] {
  return map(
    SummaryAlertProvidedActionVariables,
    (v) => AlertProvidedActionVariableDescriptions[v]
  );
}
