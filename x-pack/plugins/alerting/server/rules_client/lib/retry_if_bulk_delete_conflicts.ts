/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { chunk } from 'lodash';
import { KueryNode } from '@kbn/es-query';
import { Logger, SavedObjectsBulkUpdateObject } from '@kbn/core/server';
import type { SavedObjectsBulkDeleteResponse } from '@kbn/core-saved-objects-api-server';
import { convertRuleIdsToKueryNode } from '../../lib';
import { BulkEditError } from '../rules_client';
import { RawRule } from '../../types';
import { waitBeforeNextRetry, RETRY_IF_CONFLICTS_ATTEMPTES } from './wait_before_next_retry';

// max number of failed SO ids in one retry filter
const MaxIdsNumberInRetryFilter = 1000;

// TODO: change to Return type and decide if we need errors!
type BulkDeleteOperation = (filter: KueryNode | null) => Promise<{
  apiKeysToInvalidate: string[];
  rules: Array<SavedObjectsBulkUpdateObject<RawRule>>;
  result: SavedObjectsBulkDeleteResponse;
  errors: BulkEditError[];
  taskIdsToDelete: string[];
}>;

interface ReturnRetry {
  apiKeysToInvalidate: string[];
  errors: BulkEditError[];
  taskIdsToDelete: string[];
}

/**
 * Retries BulkDelete requests
 * If in response are presents conflicted savedObjects(409 statusCode), this util constructs filter with failed SO ids and retries bulkDelete operation until
 * all SO updated or number of retries exceeded
 * @param logger
 * @param bulkEditOperation
 * @param filter - KueryNode filter
 * @param retries - number of retries left
 * @param accApiKeysToInvalidate - accumulated apiKeys that need to be invalidated
 * @param accResults - accumulated updated savedObjects
 * @param accErrors - accumulated conflict errors
 * @param accTaskIdsToDelete - accumulated task ids
 * @returns Promise<ReturnRetry>
 */
export const retryIfBulkDeleteConflicts = async (
  logger: Logger,
  bulkDeleteOperation: BulkDeleteOperation,
  filter: KueryNode | null,
  retries: number = RETRY_IF_CONFLICTS_ATTEMPTES,
  accApiKeysToInvalidate: string[] = [],
  accErrors: BulkEditError[] = [],
  accTaskIdsToDelete: string[] = []
): Promise<ReturnRetry> => {
  try {
    const {
      apiKeysToInvalidate: localApiKeysToInvalidate,
      errors: localErrors,
      result,
      rules: localRules,
      taskIdsToDelete: localTaskIdsToDelete,
    } = await bulkDeleteOperation(filter);

    const conflictErrorMap = result.statuses.reduce<Map<string, { message: string }>>(
      (acc, item) => {
        if (item.type === 'alert' && item?.error?.statusCode === 409) {
          // do we need alert check?
          return acc.set(item.id, { message: item.error.message });
        }
        return acc;
      },
      new Map()
    );

    const apiKeysToInvalidate = [...accApiKeysToInvalidate, ...localApiKeysToInvalidate];
    const taskIdsToDelete = [...accTaskIdsToDelete, ...localTaskIdsToDelete];
    const errors = [...accErrors, ...localErrors];

    if (conflictErrorMap.size === 0) {
      return {
        apiKeysToInvalidate,
        errors,
        taskIdsToDelete,
      };
    }

    if (retries <= 0) {
      logger.warn('Bulk delele rules conflicts, exceeded retries');

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
        errors: [...errors, ...conflictErrors], // why do we need to add conflictErrors?
        taskIdsToDelete,
      };
    }

    const ids = Array.from(conflictErrorMap.keys());
    logger.debug(
      `Bulk delele rules conflicts, retrying ..., ${ids.length} saved objects conflicted`
    );

    // delay before retry
    await waitBeforeNextRetry(retries);

    // here, we construct filter query with ids. But, due to a fact that number of conflicted saved objects can exceed few thousands we can encounter following error:
    // "all shards failed: search_phase_execution_exception: [query_shard_exception] Reason: failed to create query: maxClauseCount is set to 2621"
    // That's why we chunk processing ids into pieces by size equals to MaxIdsNumberInRetryFilter
    return (
      await pMap(
        chunk(ids, MaxIdsNumberInRetryFilter),
        async (queryIds) =>
          retryIfBulkDeleteConflicts(
            logger,
            bulkDeleteOperation,
            convertRuleIdsToKueryNode(queryIds),
            retries - 1,
            apiKeysToInvalidate,
            errors
          ),
        {
          concurrency: 1,
        }
      )
    ).reduce<ReturnRetry>(
      (acc, item) => {
        return {
          apiKeysToInvalidate: [...acc.apiKeysToInvalidate, ...item.apiKeysToInvalidate],
          errors: [...acc.errors, ...item.errors],
          taskIdsToDelete: [...acc.taskIdsToDelete, ...item.taskIdsToDelete],
        };
      },
      { apiKeysToInvalidate: [], errors: [], taskIdsToDelete: [] }
    );
  } catch (err) {
    throw err;
  }
};
