/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClient, SavedObject, Logger } from '../../../../../../../../src/core/server';
import { getActionsCountInReferences } from './get_actions_count_in_references';
import { transformActions } from './transform_actions';
import { transformReferences } from './transform_references';
import { Actions, Alerting } from './types';

// Although we expect this to have empty actions on it, it might for some reason
// not have empty actions so to be safe we will concatenate the side car to it.
export const updateAlertingSavedObject = async ({
  logger,
  alert,
  actions,
  savedObjectsClient,
}: {
  logger: Logger;
  alert: SavedObject<Alerting>;
  actions: Actions[];
  savedObjectsClient: SavedObjectsClient;
}): Promise<void> => {
  logger.info(`Updating alert ${alert.id} saved object with the legacy actions side car`);

  const actionsCountInReferences = getActionsCountInReferences(alert.references);
  const transformedActions = transformActions({ actions, actionsCountInReferences });
  const transformedReferences = await transformReferences({
    actions,
    savedObjectsClient,
    logger,
    actionsCountInReferences,
  });

  try {
    await savedObjectsClient.update(
      'alert',
      alert.id,
      [...alert.attributes.actions, ...transformedActions],
      {
        references: [...alert.references, ...transformedReferences],
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '(unknown)';
    logger.error(
      `The actions on the alert "id: ${alert.id}"" was not able to be updated. Please manually adjust your interval of actions on this rule "name ${alert.attributes.name}". Error Message: ${errorMessage}`
    );
  }
};
