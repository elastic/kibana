/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pluck } from 'lodash';
import { AlertAction, State, Context, AlertType } from '../types';
import { Logger } from '../../../../../src/core/server';
import { transformActionParams } from './transform_action_params';
import { PluginStartContract as ActionsPluginStartContract } from '../../../../plugins/actions/server';

interface CreateExecutionHandlerOptions {
  alertId: string;
  executeAction: ActionsPluginStartContract['execute'];
  actions: AlertAction[];
  spaceId: string;
  apiKey: string | null;
  alertType: AlertType;
  logger: Logger;
}

interface ExecutionHandlerOptions {
  actionGroup: string;
  alertInstanceId: string;
  context: Context;
  state: State;
}

export function createExecutionHandler({
  logger,
  alertId,
  executeAction,
  actions: alertActions,
  spaceId,
  apiKey,
  alertType,
}: CreateExecutionHandlerOptions) {
  const alertTypeActionGroups = new Set(pluck(alertType.actionGroups, 'id'));
  return async ({ actionGroup, context, state, alertInstanceId }: ExecutionHandlerOptions) => {
    if (!alertTypeActionGroups.has(actionGroup)) {
      logger.error(`Invalid action group "${actionGroup}" for alert "${alertType.id}".`);
      return;
    }
    const actions = alertActions
      .filter(({ group }) => group === actionGroup)
      .map(action => {
        return {
          ...action,
          params: transformActionParams({
            alertId,
            alertInstanceId,
            context,
            params: action.params,
            state,
          }),
        };
      });
    for (const action of actions) {
      await executeAction({
        id: action.id,
        params: action.params,
        spaceId,
        apiKey,
      });
    }
  };
}
