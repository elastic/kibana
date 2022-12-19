/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ISavedObjectsRepository,
  Logger,
  SavedObjectsBulkUpdateObject,
  SavedObjectsBulkUpdateOptions,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';

export const NUM_RETRIES = 2;

interface RetryOnBulkUpdateConflictOpts<T> {
  logger: Logger;
  savedObjectsRepository: ISavedObjectsRepository;
  objects: Array<SavedObjectsBulkUpdateObject<T>>;
  options?: SavedObjectsBulkUpdateOptions;
  retries?: number;
}

interface RetryOnBulkUpdateConflictResults<T> {
  savedObjects: Array<SavedObjectsUpdateResponse<T>>;
}

export const retryOnBulkUpdateConflict = async <T>({
  logger,
  savedObjectsRepository,
  objects,
  options,
  retries = NUM_RETRIES,
}: RetryOnBulkUpdateConflictOpts<T>): Promise<RetryOnBulkUpdateConflictResults<T>> => {
  return retryOnBulkUpdateConflictHelper({
    logger,
    savedObjectsRepository,
    objects,
    options,
    retries,
  });
};

const retryOnBulkUpdateConflictHelper = async <T>({
  logger,
  savedObjectsRepository,
  objects,
  options,
  retries = NUM_RETRIES,
  accResults = [],
}: RetryOnBulkUpdateConflictOpts<T> & {
  accResults?: Array<SavedObjectsUpdateResponse<T>>;
}): Promise<RetryOnBulkUpdateConflictResults<T>> => {
  try {
    const { saved_objects: savedObjectsResults } = await savedObjectsRepository.bulkUpdate(
      objects,
      options
    );

    const currResults: Array<SavedObjectsUpdateResponse<T>> = [];
    const currConflicts: Array<SavedObjectsUpdateResponse<T>> = [];
    const objectsToRetry: Array<SavedObjectsBulkUpdateObject<T>> = [];
    savedObjectsResults.forEach(
      (savedObjectResult: SavedObjectsUpdateResponse<T>, index: number) => {
        if (savedObjectResult.error && savedObjectResult.error.statusCode === 409) {
          // The SavedObjectsRepository maintains the order of the docs
          // so we can rely on the index in the `docs` to match an error
          // on the same index in the `bulkUpdate` result
          objectsToRetry.push(objects[index]);
          currConflicts.push(savedObjectResult);
        } else {
          // Save results, whether they are successful or non-conflict errors
          currResults.push(savedObjectResult);
        }
      }
    );

    const results =
      retries <= 0
        ? [...accResults, ...currResults, ...currConflicts]
        : [...accResults, ...currResults];

    if (objectsToRetry.length === 0) {
      return {
        savedObjects: results,
      };
    }

    if (retries <= 0) {
      logger.warn(`Bulk update saved object conflicts, exceeded retries`);

      return {
        savedObjects: results,
      };
    }

    await waitBeforeNextRetry(retries);

    return retryOnBulkUpdateConflictHelper({
      logger,
      savedObjectsRepository,
      objects: objectsToRetry,
      options,
      retries: retries - 1,
      accResults: results,
    });
  } catch (err) {
    throw err;
  }
};

export const randomDelayMs = Math.floor(Math.random() * 100);
export const getExponentialDelayMultiplier = (retries: number) => 1 + (NUM_RETRIES - retries) ** 2;
export const RETRY_IF_CONFLICTS_DELAY = 250;
export const waitBeforeNextRetry = async (retries: number): Promise<void> => {
  const exponentialDelayMultiplier = getExponentialDelayMultiplier(retries);

  await new Promise((resolve) =>
    setTimeout(resolve, RETRY_IF_CONFLICTS_DELAY * exponentialDelayMultiplier + randomDelayMs)
  );
};
