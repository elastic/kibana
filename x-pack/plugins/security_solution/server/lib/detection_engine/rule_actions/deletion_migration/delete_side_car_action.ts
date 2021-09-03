/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClient, Logger } from '../../../../../../../../src/core/server';
import { ruleActionsSavedObjectType } from '../saved_object_mappings';

export const deleteSideCarAction = async ({
  logger,
  id,
  savedObjectsClient,
}: {
  logger: Logger;
  id: string;
  savedObjectsClient: SavedObjectsClient;
}) => {
  try {
    logger.info(
      `Deleting the legacy side car action of saved_object type ${ruleActionsSavedObjectType} with "id: ${id}`
    );
    await savedObjectsClient.delete(ruleActionsSavedObjectType, id);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '(unknown)';
    logger.error(
      `Error deleting saved_object type ${ruleActionsSavedObjectType} legacy side car action with "id: ${id}". Please manually delete this object. Error message: ${errorMessage}`
    );
  }
};
