/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// This module provides a helper to perform retries on a function if the
// function ends up throwing a SavedObject 409 conflict.  This can happen
// when alert SO's are updated in the background, and will avoid having to
// have the caller make explicit conflict checks, where the conflict was
// caused by a background update.

import { KueryNode, nodeBuilder } from '@kbn/es-query';
import { noop } from 'lodash';
import {
  Logger,
  SavedObjectsBulkUpdateObject,
  SavedObjectsBulkUpdateOptions,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsErrorHelpers,
  SavedObjectsUpdateResponse,
} from '../../../../../src/core/server';
import { BulkEditError, BulkEditOptions } from '../rules_client';
import { AlertTypeParams, RawRule } from '../types';

type RetryableForConflicts<T> = () => Promise<T>;

// number of times to retry when conflicts occur
export const RetryForConflictsAttempts = 2;

// milliseconds to wait before retrying when conflicts occur
// note: we considered making this random, to help avoid a stampede, but
// with 1 retry it probably doesn't matter, and adding randomness could
// make it harder to diagnose issues
const RetryForConflictsDelay = 250;

// retry an operation if it runs into 409 Conflict's, up to a limit
export async function retryIfConflicts<T>(
  logger: Logger,
  name: string,
  operation: RetryableForConflicts<T>,
  retries: number = RetryForConflictsAttempts
): Promise<T> {
  // run the operation, return if no errors or throw if not a conflict error
  try {
    return await operation();
  } catch (err) {
    if (!SavedObjectsErrorHelpers.isConflictError(err)) {
      throw err;
    }

    // must be a conflict; if no retries left, throw it
    if (retries <= 0) {
      logger.warn(`${name} conflict, exceeded retries`);
      throw err;
    }

    // delay a bit before retrying
    logger.debug(`${name} conflict, retrying ...`);
    await waitBeforeNextRetry();
    return await retryIfConflicts(logger, name, operation, retries - 1);
  }
}

type BulkUpdateRetry = (
  objects: Array<SavedObjectsBulkUpdateObject<RawRule>>,
  options?: SavedObjectsBulkUpdateOptions
) => Promise<SavedObjectsBulkUpdateResponse<RawRule>>;

type GetBulkUpdateObjects = <P extends AlertTypeParams>({
  filter,
  operations,
  paramsModifier,
}: {
  filter: KueryNode;
  operations: BulkEditOptions<P>['operations'];
  paramsModifier: BulkEditOptions<P>['paramsModifier'];
}) => Promise<{
  apiKeysToInvalidate: string[];
  rules: Array<SavedObjectsBulkUpdateObject<RawRule>>;
  errors: BulkEditError[];
}>;

export const retryOnBulkIfConflicts = async <P extends AlertTypeParams>(
  logger: Logger,
  name: string,
  bulkUpdate: BulkUpdateRetry,
  getBulkUpdateObjects: GetBulkUpdateObjects,
  filter: KueryNode,
  operations: BulkEditOptions<P>['operations'],
  paramsModifier: BulkEditOptions<P>['paramsModifier'],
  retries: number = RetryForConflictsAttempts,
  apiKeysToInvalidate: string[] = [],
  results: Array<SavedObjectsUpdateResponse<RawRule>> = [],
  errors: BulkEditError[] = []
): Promise<{
  apiKeysToInvalidate: string[];
  results: Array<SavedObjectsUpdateResponse<RawRule>>;
  errors: BulkEditError[];
}> => {
  // run the operation, return if no errors or throw if not a conflict error
  try {
    const {
      apiKeysToInvalidate: localApiKeysToInvalidate,
      rules: localRules,
      errors: localErrors,
    } = await getBulkUpdateObjects({
      filter,
      operations,
      paramsModifier,
    });
    const localResults = await bulkUpdate(localRules);
    const idsWithConflictError = localResults.saved_objects.reduce<string[]>((acc, item) => {
      if (item.type === 'alert' && item?.error?.statusCode === 409) {
        return [...acc, item.id];
      }
      return acc;
    }, []);

    if (idsWithConflictError.length > 0) {
      const newBulkUpdateObjects = localRules.filter((obj) =>
        idsWithConflictError.includes(obj.id)
      );
      if (retries <= 0) {
        newBulkUpdateObjects.forEach((obj) => {
          localErrors.push({
            message: '',
            rule: {
              id: obj.id,
              name: obj.attributes?.name ?? '',
            },
          });
        });
      } else {
        const filterKueryNode = nodeBuilder.or(
          idsWithConflictError.map((ruleId) => nodeBuilder.is('alert.id', `alert:${ruleId}`))
        );
        await waitBeforeNextRetry();
        return await retryOnBulkIfConflicts(
          logger,
          name,
          bulkUpdate,
          getBulkUpdateObjects,
          filterKueryNode,
          operations,
          paramsModifier,
          retries - 1,
          [...apiKeysToInvalidate, ...localApiKeysToInvalidate],
          [...results, ...localResults.saved_objects.filter((res) => res.error === undefined)],
          [...errors, ...localErrors]
        );
      }
    }
    return {
      apiKeysToInvalidate: [...apiKeysToInvalidate, ...localApiKeysToInvalidate],
      results: [...results, ...localResults.saved_objects.filter((res) => res.error === undefined)],
      errors: [...errors, ...localErrors],
    };
  } catch (err) {
    throw err;
  }
};

async function waitBeforeNextRetry(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, RetryForConflictsDelay));
}
