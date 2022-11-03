/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { chunk } from 'lodash';
import { KueryNode } from '@kbn/es-query';
import { Logger } from '@kbn/core/server';
import { convertRuleIdsToKueryNode } from '../../lib';
import { BulkOperationError } from '../rules_client';
import { waitBeforeNextRetry, RETRY_IF_CONFLICTS_ATTEMPTS } from './wait_before_next_retry';

const MAX_RULES_IDS_IN_RETRY = 1000;

export type BulkEnableOperation = (filter: KueryNode | null) => Promise<{
  errors: BulkOperationError[];
  taskIdsToEnable: string[];
}>;

interface ReturnRetry {
  errors: BulkOperationError[];
  taskIdsToEnable: string[];
}

/**
 * Retries BulkEnable requests
 * If in response are presents conflicted savedObjects(409 statusCode), this util constructs filter with failed SO ids and retries bulkEnable operation until
 * all SO updated or number of retries exceeded
 * @param logger
 * @param bulkEnableOperation
 * @param filter - KueryNode filter
 * @param retries - number of retries left
 * @param accErrors - accumulated conflict errors
 * @param accTaskIdsToEnable - accumulated task ids
 * @returns Promise<ReturnRetry>
 */

export const retryIfBulkEnableConflicts = async (
  logger: Logger,
  bulkEnableOperation: BulkEnableOperation,
  filter: KueryNode | null,
  retries: number = RETRY_IF_CONFLICTS_ATTEMPTS,
  accErrors: BulkOperationError[] = [],
  accTaskIdsToEnable: string[] = []
): Promise<ReturnRetry> => {
  try {
    const { errors: currentErrors, taskIdsToEnable: currentTaskIdsToEnable } =
      await bulkEnableOperation(filter);

    const taskIdsToEnable = [...accTaskIdsToEnable, ...currentTaskIdsToEnable];
    const errors =
      retries <= 0
        ? [...accErrors, ...currentErrors]
        : [...accErrors, ...currentErrors.filter((error) => error.status !== 409)];

    const ruleIdsWithConflictError = currentErrors.reduce<string[]>((acc, error) => {
      if (error.status === 409) {
        return [...acc, error.rule.id];
      }
      return acc;
    }, []);

    if (ruleIdsWithConflictError.length === 0) {
      return {
        errors,
        taskIdsToEnable,
      };
    }

    if (retries <= 0) {
      logger.warn('Bulk enable rules conflicts, exceeded retries');

      return {
        errors,
        taskIdsToEnable,
      };
    }

    logger.debug(
      `Bulk enable rules conflicts, retrying ..., ${ruleIdsWithConflictError.length} saved objects conflicted`
    );

    await waitBeforeNextRetry(retries);

    // here, we construct filter query with ids. But, due to a fact that number of conflicted saved objects can exceed few thousands we can encounter following error:
    // "all shards failed: search_phase_execution_exception: [query_shard_exception] Reason: failed to create query: maxClauseCount is set to 2621"
    // That's why we chunk processing ids into pieces by size equals to MAX_RULES_IDS_IN_RETRY
    return (
      await pMap(
        chunk(ruleIdsWithConflictError, MAX_RULES_IDS_IN_RETRY),
        async (queryIds) =>
          retryIfBulkEnableConflicts(
            logger,
            bulkEnableOperation,
            convertRuleIdsToKueryNode(queryIds),
            retries - 1,
            errors,
            taskIdsToEnable
          ),
        {
          concurrency: 1,
        }
      )
    ).reduce<ReturnRetry>(
      (acc, item) => {
        return {
          errors: [...acc.errors, ...item.errors],
          taskIdsToEnable: [...acc.taskIdsToEnable, ...item.taskIdsToEnable],
        };
      },
      { errors: [], taskIdsToEnable: [] }
    );
  } catch (err) {
    throw err;
  }
};
