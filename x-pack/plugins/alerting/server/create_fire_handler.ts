/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Handlebars from 'handlebars';
import { SavedObject } from 'src/legacy/server/saved_objects';
import { AlertAction, State, Context } from './types';
import { ActionsPlugin } from '../../actions';

interface CreateFireHandlerOptions {
  fireAction: ActionsPlugin['fire'];
  alertSavedObject: SavedObject;
}

export function createFireHandler({ fireAction, alertSavedObject }: CreateFireHandlerOptions) {
  return async (actionGroup: string, context: Context, state: State) => {
    const alertActions: AlertAction[] = alertSavedObject.attributes.actions;
    const actions = alertActions.filter(({ group }: { group: string }) => group === actionGroup);
    for (const action of actions) {
      const params: Record<string, any> = {};
      for (const key of Object.keys(action.params)) {
        const value = action.params[key];
        if (typeof value !== 'string') {
          params[key] = value;
          continue;
        }
        const template = Handlebars.compile(value);
        params[key] = template({ context, state });
      }
      fireAction({
        id: action.id,
        params,
      });
    }
  };
}
