/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ActionVariable, ActionVariables } from '../../types';

// return a "flattened" list of action variables for an alertType
export function actionVariablesFromAlertType(actionVariables: ActionVariables): ActionVariable[] {
  const alwaysProvidedVars = getAlwaysProvidedActionVariables();
  const contextVars = actionVariables.context
    ? prefixKeys(actionVariables.context, 'context.')
    : [];
  const paramsVars = prefixKeys(actionVariables.params, 'params.');
  const stateVars = prefixKeys(actionVariables.state, 'state.');

  return alwaysProvidedVars.concat(contextVars, paramsVars, stateVars);
}

function prefixKeys(actionVariables: ActionVariable[], prefix: string): ActionVariable[] {
  return actionVariables.map((actionVariable) => {
    return { name: `${prefix}${actionVariable.name}`, description: actionVariable.description };
  });
}

// this list should be the same as in:
//   x-pack/plugins/alerts/server/task_runner/transform_action_params.ts
function getAlwaysProvidedActionVariables(): ActionVariable[] {
  const result: ActionVariable[] = [];

  result.push({
    name: 'alertId',
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.alertIdLabel', {
      defaultMessage: 'The id of the alert.',
    }),
  });

  result.push({
    name: 'alertName',
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.alertNameLabel', {
      defaultMessage: 'The name of the alert.',
    }),
  });

  result.push({
    name: 'spaceId',
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.spaceIdLabel', {
      defaultMessage: 'The spaceId of the alert.',
    }),
  });

  result.push({
    name: 'tags',
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.tagsLabel', {
      defaultMessage: 'The tags of the alert.',
    }),
  });

  result.push({
    name: 'alertInstanceId',
    description: i18n.translate('xpack.triggersActionsUI.actionVariables.alertInstanceIdLabel', {
      defaultMessage: 'The alert instance id that scheduled actions for the alert.',
    }),
  });

  return result;
}
