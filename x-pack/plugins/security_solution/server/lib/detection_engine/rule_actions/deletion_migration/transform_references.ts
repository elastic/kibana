/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveActionSavedObject } from './resolve_action_saved_object';
import { SavedObjectsClient, Logger } from '../../../../../../../../src/core/server';
import { Actions, Reference } from './types';

export const transformReferences = async ({
  actions,
  savedObjectsClient,
  logger,
  actionsCountInReferences,
}: {
  actions: Actions[];
  savedObjectsClient: SavedObjectsClient;
  logger: Logger;
  actionsCountInReferences: number;
}): Promise<Reference[]> => {
  return actions.reduce<Promise<Reference[]>>(async (accumPromise, current, index) => {
    const accum = await accumPromise;
    const { id } = current;
    const actionSavedObject = await resolveActionSavedObject({
      savedObjectsClient,
      actionId: id,
      logger,
    });
    if (actionSavedObject != null) {
      return [
        ...accum,
        {
          id: actionSavedObject.id,
          name: `action_${index + actionsCountInReferences}`,
          type: 'action',
        },
      ];
    } else {
      return accum;
    }
  }, Promise.resolve([]));
};
