/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from '@kbn/core/server';
import { RawRule } from '../../types';
import {
  preconfiguredConnectorActionRefPrefix,
  systemConnectorActionRefPrefix,
} from '../common/constants';
import {
  NormalizedAlertActionWithGeneratedValues,
  NormalizedAlertDefaultActionWithGeneratedValues,
  NormalizedAlertSystemActionWithGeneratedValues,
  RulesClientContext,
} from '../types';

export async function denormalizeActions(
  context: RulesClientContext,
  alertActions: NormalizedAlertActionWithGeneratedValues[]
): Promise<{ actions: RawRule['actions']; references: SavedObjectReference[] }> {
  const references: SavedObjectReference[] = [];
  const actions: RawRule['actions'] = [];

  if (alertActions.length) {
    const actionsClient = await context.getActionsClient();
    const actionIds = [...new Set(alertActions.map((alertAction) => alertAction.id))];

    const actionResults = await actionsClient.getBulk({
      ids: actionIds,
      throwIfSystemAction: false,
    });

    const actionTypeIds = [...new Set(actionResults.map((action) => action.actionTypeId))];

    actionTypeIds.forEach((id) => {
      // Notify action type usage via "isActionTypeEnabled" function
      actionsClient.isActionTypeEnabled(id, { notifyUsage: true });
    });

    /**
     * Be aware that TS does not produce an error when spreading the alertAction.
     * The id and the type should not be persisted to ES.
     */
    alertActions.forEach(({ id, type, ...alertAction }, i) => {
      const actionResultValue = actionResults.find((action) => action.id === id);
      if (actionResultValue) {
        if (actionsClient.isPreconfigured(id)) {
          const action = alertAction as Omit<
            NormalizedAlertDefaultActionWithGeneratedValues,
            'id' | 'type'
          >;

          actions.push({
            group: action.group,
            params: action.params,
            uuid: action.uuid,
            ...(action.frequency && { frequency: action.frequency }),
            ...(action.alertsFilter && { alertsFilter: action.alertsFilter }),
            actionRef: `${preconfiguredConnectorActionRefPrefix}${id}`,
            actionTypeId: actionResultValue.actionTypeId,
          });
        } else if (actionsClient.isSystemAction(id)) {
          const action = alertAction as Omit<
            NormalizedAlertSystemActionWithGeneratedValues,
            'id' | 'type'
          >;

          actions.push({
            params: action.params,
            uuid: action.uuid,
            actionRef: `${systemConnectorActionRefPrefix}${id}`,
            actionTypeId: actionResultValue.actionTypeId,
          });
        } else {
          const action = alertAction as Omit<
            NormalizedAlertDefaultActionWithGeneratedValues,
            'id' | 'type'
          >;

          const actionRef = `action_${i}`;

          references.push({
            id,
            name: actionRef,
            type: 'action',
          });

          actions.push({
            group: action.group,
            params: action.params,
            uuid: action.uuid,
            ...(action.frequency && { frequency: action.frequency }),
            ...(action.alertsFilter && { alertsFilter: action.alertsFilter }),
            actionRef,
            actionTypeId: actionResultValue.actionTypeId,
          });
        }
      } else {
        actions.push({
          ...alertAction,
          actionRef: '',
          actionTypeId: '',
        });
      }
    });
  }
  return {
    actions,
    references,
  };
}
