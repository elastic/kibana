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
import { convertRuleIdsToKueryNode } from '../../lib';
import { BulkOperationError } from '../types';
import { waitBeforeNextRetry, RETRY_IF_CONFLICTS_ATTEMPTS } from './wait_before_next_retry';
import { RawRule } from '../../types';

const MAX_RULES_IDS_IN_RETRY = 1000;

export type BulkDisableOperation = (filter: KueryNode | null) => Promise<{
  errors: BulkOperationError[];
  rules: Array<SavedObjectsBulkUpdateObject<RawRule>>;
  taskIdsToDisable: string[];
  taskIdsToDelete: string[];
}>;

interface ReturnRetry {
  errors: BulkOperationError[];
  rules: Array<SavedObjectsBulkUpdateObject<RawRule>>;
  taskIdsToDisable: string[];
  taskIdsToDelete: string[];
}

/**
 * Retries BulkDisable requests
 * If in response are presents conflicted savedObjects(409 statusCode), this util constructs filter with failed SO ids and retries bulkDisable operation until
 * all SO updated or number of retries exceeded
 * @param logger
 * @param bulkDisableOperation
 * @param filter - KueryNode filter
 * @param retries - number of retries left
 * @param accErrors - accumulated conflict errors
 * @param accRules - accumulated disabled rules
 * @param accTaskIdsToDisable - accumulated task ids to disable
 * @param accTaskIdsToDelete - accumulated task ids to delete
 * @returns Promise<ReturnRetry>
 */

export const retryIfBulkDisableConflicts = async (
  logger: Logger,
  bulkDisableOperation: BulkDisableOperation,
  filter: KueryNode | null,
  retries: number = RETRY_IF_CONFLICTS_ATTEMPTS,
  accErrors: BulkOperationError[] = [],
  accRules: Array<SavedObjectsBulkUpdateObject<RawRule>> = [],
  accTaskIdsToDisable: string[] = [],
  accTaskIdsToDelete: string[] = []
): Promise<ReturnRetry> => {
  try {
    const {
      errors: currentErrors,
      rules: currentRules,
      taskIdsToDisable: currentTaskIdsToDisable,
      taskIdsToDelete: currentTaskIdsToDelete,
    } = await bulkDisableOperation(filter);

    const rules = [...accRules, ...currentRules];
    const taskIdsToDisable = [...accTaskIdsToDisable, ...currentTaskIdsToDisable];
    const taskIdsToDelete = [...accTaskIdsToDelete, ...currentTaskIdsToDelete];
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
        rules,
        taskIdsToDisable,
        taskIdsToDelete,
      };
    }

    if (retries <= 0) {
      logger.warn('Bulk disable rules conflicts, exceeded retries');

      return {
        errors,
        rules,
        taskIdsToDisable,
        taskIdsToDelete,
      };
    }

    logger.debug(
      `Bulk disable rules conflicts, retrying ..., ${ruleIdsWithConflictError.length} saved objects conflicted`
    );

    await waitBeforeNextRetry(retries);

    // here, we construct filter query with ids. But, due to a fact that number of conflicted saved objects can exceed few thousands we can encounter following error:
    // "all shards failed: search_phase_execution_exception: [query_shard_exception] Reason: failed to create query: maxClauseCount is set to 2621"
    // That's why we chunk processing ids into pieces by size equals to MAX_RULES_IDS_IN_RETRY
    return (
      await pMap(
        chunk(ruleIdsWithConflictError, MAX_RULES_IDS_IN_RETRY),
        async (queryIds) =>
          retryIfBulkDisableConflicts(
            logger,
            bulkDisableOperation,
            convertRuleIdsToKueryNode(queryIds),
            retries - 1,
            errors,
            rules,
            taskIdsToDisable
          ),
        {
          concurrency: 1,
        }
      )
    ).reduce<ReturnRetry>(
      (acc, item) => {
        return {
          errors: [...acc.errors, ...item.errors],
          rules: [...acc.rules, ...item.rules],
          taskIdsToDisable: [...acc.taskIdsToDisable, ...item.taskIdsToDisable],
          taskIdsToDelete: [...acc.taskIdsToDelete, ...item.taskIdsToDelete],
        };
      },
      { errors: [], rules: [], taskIdsToDisable: [], taskIdsToDelete: [] }
    );
  } catch (err) {
    throw err;
  }
};
