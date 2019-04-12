/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { DynamicAction } from './dynamic_action';
import { ActionSavedObjectAttributes } from './action_saved_object';
import { fromSavedObject } from './from_saved_object';

export async function getActions() {
  const response = await chrome.getSavedObjectsClient().find<ActionSavedObjectAttributes>({
    type: 'ui_action',
    fields: ['title', 'description', 'type', 'configuration', 'embeddableId', 'embeddableType'],
    perPage: 10000,
  });

  const actions: DynamicAction[] = [];
  const fillActions = response.savedObjects.map(async actionSavedObject => {
    const action = await fromSavedObject(actionSavedObject);
    if (action) {
      actions.push(action);
    }
  });

  await Promise.all(fillActions);

  return actions;
}
