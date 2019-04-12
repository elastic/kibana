/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { actionRegistry } from '../../../../../src/legacy/core_plugins/embeddable_api/public';
import { DynamicAction } from './dynamic_action';
import { ActionSavedObject } from './action_saved_object';
import { fromSavedObject } from './from_saved_object';

export async function addAction(action: DynamicAction): Promise<DynamicAction> {
  const savedObjectsClient = chrome.getSavedObjectsClient();
  let actionSavedObject: ActionSavedObject;
  if (action.id) {
    actionSavedObject = await savedObjectsClient.create(
      'ui_action',
      action.getSavedObjectAttributes(),
      {
        id: action.id,
      }
    );
  } else {
    actionSavedObject = await savedObjectsClient.create(
      'ui_action',
      action.getSavedObjectAttributes()
    );
  }

  const savedAction = await create(actionSavedObject);

  actionRegistry.addAction(savedAction);

  return savedAction;
}
