/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { chunk } from 'lodash';
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

// max number of failed SO ids in one retry filter
const MaxIdsNumberInRetryFilter = 1000;

type BulkEditOperation = (filter: KueryNode | null) => Promise<{
  apiKeysToInvalidate: string[];
  rules: Array<SavedObjectsBulkUpdateObject<RawRule>>;
  resultSavedObjects: Array<SavedObjectsUpdateResponse<RawRule>>;
  errors: BulkEditError[];
}>;

interface ReturnRetry {
  apiKeysToInvalidate: string[];
  results: Array<SavedObjectsUpdateResponse<RawRule>>;
  errors: BulkEditError[];
}

/**
 * Retries BulkEdit requests
 * If in response are presents conflicted savedObjects(409 statusCode), this util constructs filter with failed SO ids and retries bulkEdit operation until
 * all SO updated or number of retries exceeded
 * @param logger
 * @param name
 * @param bulkEditOperation
 * @param filter - KueryNode filter
 * @param retries - number of retries left
 * @param accApiKeysToInvalidate - accumulated apiKeys that need to be invalidated
 * @param accResults - accumulated updated savedObjects
 * @param accErrors - accumulated conflict errors
 * @returns Promise<ReturnRetry>
 */
export const retryIfBulkEditConflicts = async (
  logger: Logger,
  name: string,
  bulkEditOperation: BulkEditOperation,
  filter: KueryNode | null,
  retries: number = RetryForConflictsAttempts,
  accApiKeysToInvalidate: string[] = [],
  accResults: Array<SavedObjectsUpdateResponse<RawRule>> = [],
  accErrors: BulkEditError[] = []
): Promise<ReturnRetry> => {
  // run the operation, return if no errors or throw if not a conflict error
  try {
    const {
      apiKeysToInvalidate: localApiKeysToInvalidate,
      resultSavedObjects,
      errors: localErrors,
      rules: localRules,
    } = await bulkEditOperation(filter);

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

    const ids = Array.from(conflictErrorMap.keys());
    logger.debug(`${name} conflicts, retrying ..., ${ids.length} saved objects conflicted`);

    // delay before retry
    await waitBeforeNextRetry(retries);

    // here, we construct filter query with ids. But, due to a fact that number of conflicted saved objects can exceed few thousands we can encounter following error:
    // "all shards failed: search_phase_execution_exception: [query_shard_exception] Reason: failed to create query: maxClauseCount is set to 2621"
    // That's why we chunk processing ids into pieces by size equals to MaxIdsNumberInRetryFilter
    return (
      await pMap(
        chunk(ids, MaxIdsNumberInRetryFilter),
        async (queryIds) =>
          retryIfBulkEditConflicts(
            logger,
            name,
            bulkEditOperation,
            convertRuleIdsToKueryNode(queryIds),
            retries - 1,
            apiKeysToInvalidate,
            results,
            errors
          ),
        {
          concurrency: 1,
        }
      )
    ).reduce<ReturnRetry>(
      (acc, item) => {
        return {
          results: [...acc.results, ...item.results],
          apiKeysToInvalidate: [...acc.apiKeysToInvalidate, ...item.apiKeysToInvalidate],
          errors: [...acc.errors, ...item.errors],
        };
      },
      { results: [], apiKeysToInvalidate: [], errors: [] }
    );
  } catch (err) {
    throw err;
  }
};

// exponential delay before retry with adding random delay
async function waitBeforeNextRetry(retries: number): Promise<void> {
  const exponentialDelayMultiplier = 1 + (RetryForConflictsAttempts - retries) ** 2;
  const randomDelayMs = Math.floor(Math.random() * 100);

  await new Promise((resolve) =>
    setTimeout(resolve, RetryForConflictsDelay * exponentialDelayMultiplier + randomDelayMs)
  );
}
