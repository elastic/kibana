/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { Logger } from '../../../../../../../src/core/server';
import { MigrationTask } from '../types';

export interface DeleteSavedObjectsOptions<T> {
  logger: Logger;
  savedObjects: MigrationTask<T>['deleteSavedObjects'];
  savedObjectsClient: SavedObjectsClientContract;
}

export const deleteSavedObjects = async <T>({
  logger,
  savedObjects,
  savedObjectsClient,
}: DeleteSavedObjectsOptions<T>): Promise<void> => {
  if (savedObjects != null) {
    for (const savedObject of savedObjects) {
      logger.debug(
        `Searching for any saved_object "type: ${savedObject.type}", "filter: ${savedObject.filter}", "defaultSearchOperator: ${savedObject.defaultSearchOperator}" to delete`
      );
      try {
        const soClientFinders = savedObjectsClient.createPointInTimeFinder<unknown>({
          perPage: 100,
          filter: savedObject.filter,
          type: savedObject.type,
          defaultSearchOperator: savedObject.defaultSearchOperator,
        });

        for await (const soClientFind of soClientFinders.find()) {
          const { saved_objects: savedObjectsFound } = soClientFind;
          logger.debug(
            `Found ${savedObjectsFound.length} of "type: ${savedObject.type}", "filter: ${savedObject.filter}", "defaultSearchOperator: ${savedObject.defaultSearchOperator}" to delete`
          );
          for (const savedObjectFound of savedObjectsFound) {
            await deleteSavedObject({
              logger,
              type: savedObjectFound.type,
              id: savedObjectFound.id,
              savedObjectsClient,
            });
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '(unknown)';
        logger.error(
          `Error finding saved_object "type: ${savedObject.type}", "filter: ${savedObject.filter}", "defaultSearchOperator: ${savedObject.defaultSearchOperator}". Error message: ${errorMessage}`
        );
      }
    }
  }
};

export interface DeleteSavedObjectOptions {
  logger: Logger;
  type: string;
  id: string;
  savedObjectsClient: SavedObjectsClientContract;
}

export const deleteSavedObject = async ({
  logger,
  type,
  id,
  savedObjectsClient,
}: DeleteSavedObjectOptions): Promise<void> => {
  try {
    logger.debug(`Deleting saved_object type ${type} with "id: ${id}`);
    await savedObjectsClient.delete(type, id);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '(unknown)';
    logger.error(
      `Error deleting saved_object type ${type} with "id: ${id}". Please manually delete this object. Error message: ${errorMessage}`
    );
  }
};
