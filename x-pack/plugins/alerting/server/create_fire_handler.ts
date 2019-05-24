/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertType, State, Context } from './types';
import { TaskInstance } from '../../task_manager';
import { ActionsPlugin } from '../../actions';

export function createFireHandler(
  alertType: AlertType,
  taskInstance: TaskInstance,
  fireAction: ActionsPlugin['fire']
) {
  return async (actionGroupId: string, context: Context, state: State) => {
    const actions =
      taskInstance.params.actionGroups[actionGroupId] ||
      taskInstance.params.actionGroups.default ||
      [];
    for (const action of actions) {
      fireAction({
        id: action.id,
        // TODO: Maybe not merge context & state here, but somewhere before
        params: { ...context, ...state },
      });
    }
  };
}
