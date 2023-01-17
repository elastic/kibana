/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from '@kbn/core/server';
import { RawRule, RawRuleAction } from '../../types';
import { preconfiguredConnectorActionRefPrefix } from '../common/constants';
import { NormalizedAlertActionOptionalUuid, RulesClientContext } from '../types';

export async function denormalizeActions(
  context: RulesClientContext,
  alertActions: NormalizedAlertActionOptionalUuid[]
): Promise<{ actions: RawRule['actions']; references: SavedObjectReference[] }> {
  const references: SavedObjectReference[] = [];
  const actions: RawRule['actions'] = [];
  if (alertActions.length) {
    const actionsClient = await context.getActionsClient();
    const actionIds = [...new Set(alertActions.map((alertAction) => alertAction.id))];
    const actionResults = await actionsClient.getBulk(actionIds);
    const actionTypeIds = [...new Set(actionResults.map((action) => action.actionTypeId))];
    actionTypeIds.forEach((id) => {
      // Notify action type usage via "isActionTypeEnabled" function
      actionsClient.isActionTypeEnabled(id, { notifyUsage: true });
    });
    alertActions.forEach(({ id, ...alertAction }, i) => {
      const actionResultValue = actionResults.find((action) => action.id === id);
      if (actionResultValue) {
        if (actionsClient.isPreconfigured(id)) {
          actions.push({
            ...alertAction,
            actionRef: `${preconfiguredConnectorActionRefPrefix}${id}`,
            actionTypeId: actionResultValue.actionTypeId,
          } as RawRuleAction);
        } else {
          const actionRef = `action_${i}`;
          references.push({
            id,
            name: actionRef,
            type: 'action',
          });
          actions.push({
            ...alertAction,
            actionRef,
            actionTypeId: actionResultValue.actionTypeId,
          } as RawRuleAction);
        }
      } else {
        actions.push({
          ...alertAction,
          actionRef: '',
          actionTypeId: '',
        } as RawRuleAction);
      }
    });
  }
  return {
    actions,
    references,
  };
}
