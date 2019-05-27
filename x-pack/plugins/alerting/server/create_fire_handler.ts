/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject } from 'src/legacy/server/saved_objects';
import { State, Context } from './types';
import { ActionsPlugin } from '../../actions';

interface CreateFireHandlerOptions {
  fireAction: ActionsPlugin['fire'];
  alertSavedObject: SavedObject;
}

export function createFireHandler({ fireAction, alertSavedObject }: CreateFireHandlerOptions) {
  return async (actionGroupId: string, context: Context, state: State) => {
    const actions =
      alertSavedObject.attributes.actionGroups[actionGroupId] ||
      alertSavedObject.attributes.actionGroups.default ||
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
