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

import { KueryNode } from '@kbn/es-query';
import {
  Logger,
  SavedObjectsBulkUpdateObject,
  SavedObjectsUpdateResponse,
} from '../../../../../../src/core/server';
import { convertRuleIdsToKueryNode } from '../../lib';
import { BulkEditError } from '../rules_client';
import { RawRule } from '../../types';

// number of times to retry when conflicts occur
export const RetryForConflictsAttempts = 2;

// milliseconds to wait before retrying when conflicts occur
// note: we considered making this random, to help avoid a stampede, but
// with 1 retry it probably doesn't matter, and adding randomness could
// make it harder to diagnose issues
const RetryForConflictsDelay = 250;

type BulkEditObjects = (filter: KueryNode) => Promise<{
  apiKeysToInvalidate: string[];
  rules: Array<SavedObjectsBulkUpdateObject<RawRule>>;
  resultSavedObjects: Array<SavedObjectsUpdateResponse<RawRule>>;
  errors: BulkEditError[];
}>;

export const retryIfBulkEditConflicts = async (
  logger: Logger,
  name: string,
  bulkEditObjects: BulkEditObjects,
  filter: KueryNode,
  retries: number = RetryForConflictsAttempts,
  accApiKeysToInvalidate: string[] = [],
  accResults: Array<SavedObjectsUpdateResponse<RawRule>> = [],
  accErrors: BulkEditError[] = []
): Promise<{
  apiKeysToInvalidate: string[];
  results: Array<SavedObjectsUpdateResponse<RawRule>>;
  errors: BulkEditError[];
}> => {
  // run the operation, return if no errors or throw if not a conflict error
  try {
    const {
      apiKeysToInvalidate: localApiKeysToInvalidate,
      resultSavedObjects,
      errors: localErrors,
      rules: localRules,
    } = await bulkEditObjects(filter);

    const conflictErrorMap = resultSavedObjects.reduce<Map<string, { message: string }>>(
      (acc, item) => {
        if (item.type === 'alert' && item?.error?.statusCode === 409) {
          return acc.set(item.id, { message: item.error.message });
        }
        return acc;
      },
      new Map()
    );

    const results = [...accResults, ...resultSavedObjects.filter((res) => res.error === undefined)];
    const apiKeysToInvalidate = [...accApiKeysToInvalidate, ...localApiKeysToInvalidate];
    const errors = [...accErrors, ...localErrors];

    if (conflictErrorMap.size === 0) {
      return {
        apiKeysToInvalidate,
        results,
        errors,
      };
    }

    if (retries <= 0) {
      logger.warn(`${name} conflicts, exceeded retries`);

      const conflictErrors = localRules
        .filter((obj) => conflictErrorMap.has(obj.id))
        .map((obj) => ({
          message: conflictErrorMap.get(obj.id)?.message ?? 'n/a',
          rule: {
            id: obj.id,
            name: obj.attributes?.name ?? 'n/a',
          },
        }));

      return {
        apiKeysToInvalidate,
        results,
        errors: [...errors, ...conflictErrors],
      };
    }

    logger.debug(`${name} conflicts, retrying ...`);

    // delay before retry
    await waitBeforeNextRetry();
    return await retryIfBulkEditConflicts(
      logger,
      name,
      bulkEditObjects,
      convertRuleIdsToKueryNode(Array.from(conflictErrorMap.keys())),
      retries - 1,
      apiKeysToInvalidate,
      results,
      errors
    );
  } catch (err) {
    throw err;
  }
};

async function waitBeforeNextRetry(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, RetryForConflictsDelay));
}
