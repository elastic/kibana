/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { actionFactoryRegistry } from './action_factory_registry';
import { ActionSavedObject } from './action_saved_object';

export async function fromSavedObject(actionSavedObject: ActionSavedObject) {
  const actionFactory = actionFactoryRegistry.getFactoryById(actionSavedObject.attributes.type);
  if (!actionFactory) {
    throw new Error(
      `Action of type ${
        actionSavedObject.attributes.type
      } missing. Perhaps a plugin was uninstalled?`
    );
  }
  return actionFactory.fromSavedObject(actionSavedObject);
}
