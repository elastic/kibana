/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClient, SavedObject, Logger } from '../../../../../../../../src/core/server';
import { Alerting } from './types';

export const resolveActionSavedObject = async ({
  savedObjectsClient,
  actionId,
  logger,
}: {
  logger: Logger;
  savedObjectsClient: SavedObjectsClient;
  actionId: string;
}): Promise<SavedObject<unknown> | undefined> => {
  try {
    const action = await savedObjectsClient.resolve<Alerting>('action', actionId);
    logger.info(
      `The action resolution for action id: "${actionId}" is outcome: "${action.outcome}". The id returned with the saved_object is: ${action.saved_object.id}`
    );
    return action.saved_object;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '(unknown)';
    logger.error(
      `This action within alerting was not found ${actionId}, no migration will be attempted for this action. Error Message: ${errorMessage}`
    );
    return undefined;
  }
};
