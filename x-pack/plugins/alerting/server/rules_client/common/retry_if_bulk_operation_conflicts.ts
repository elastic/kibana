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
import { withSpan } from '@kbn/apm-utils';
import { convertRuleIdsToKueryNode } from '../../lib';
import { BulkOperationError } from '../types';
import { waitBeforeNextRetry, RETRY_IF_CONFLICTS_ATTEMPTS } from './wait_before_next_retry';
import { RuleAttributes } from '../../data/rule/types';

const MAX_RULES_IDS_IN_RETRY = 1000;

interface BulkOperationResult {
  errors: BulkOperationError[];
  rules: Array<SavedObjectsBulkUpdateObject<RuleAttributes>>;
  accListSpecificForBulkOperation: string[][];
}

export const retryIfBulkOperationConflicts = async ({
  action,
  logger,
  bulkOperation,
  filter,
  retries = RETRY_IF_CONFLICTS_ATTEMPTS,
}: {
  action: 'DELETE' | 'ENABLE' | 'DISABLE';
  logger: Logger;
  bulkOperation: (filter: KueryNode | null) => Promise<BulkOperationResult>;
  filter: KueryNode | null;
  retries?: number;
}): Promise<BulkOperationResult> => {
  return withSpan({ name: 'retryIfBulkOperationConflicts', type: 'rules' }, () =>
    handler({
      action,
      logger,
      bulkOperation,
      filter,
      retries,
    })
  );
};

const handler = async ({
  action,
  logger,
  bulkOperation,
  filter,
  accListSpecificForBulkOperation, // this list can include several accumulators, depends on the type of bulk operation
  accErrors = [],
  accRules = [],
  retries = RETRY_IF_CONFLICTS_ATTEMPTS,
}: {
  action: 'DELETE' | 'ENABLE' | 'DISABLE';
  logger: Logger;
  bulkOperation: (filter: KueryNode | null) => Promise<BulkOperationResult>;
  filter: KueryNode | null;
  accListSpecificForBulkOperation?: string[][];
  accErrors?: BulkOperationError[];
  accRules?: Array<SavedObjectsBulkUpdateObject<RuleAttributes>>;
  retries?: number;
}): Promise<BulkOperationResult> => {
  try {
    const {
      errors: currentErrors,
      rules: currentRules,
      accListSpecificForBulkOperation: currentAccListSpecificForBulkOperation,
    } = await bulkOperation(filter);

    // it a way to assign default value for a accListSpecificForBulkOperation
    if (!accListSpecificForBulkOperation) {
      accListSpecificForBulkOperation = Array.from(
        Array(currentAccListSpecificForBulkOperation.length),
        () => []
      );
    }

    const rules = [...accRules, ...currentRules];

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

    const newAccListSpecificForBulkOperation = accListSpecificForBulkOperation.map((acc, index) => [
      ...acc,
      ...currentAccListSpecificForBulkOperation[index],
    ]);

    if (ruleIdsWithConflictError.length === 0) {
      return {
        errors,
        rules,
        accListSpecificForBulkOperation: newAccListSpecificForBulkOperation,
      };
    }

    if (retries <= 0) {
      logger.warn(`Bulk ${action.toLowerCase()} rules conflicts, exceeded retries`);

      return {
        errors,
        rules,
        accListSpecificForBulkOperation: newAccListSpecificForBulkOperation,
      };
    }

    logger.debug(
      `Bulk ${action.toLowerCase()} rules conflicts, retrying ..., ${
        ruleIdsWithConflictError.length
      } saved objects conflicted`
    );

    await waitBeforeNextRetry(retries);

    // here, we construct filter query with ids. But, due to a fact that number of conflicted saved objects can exceed few thousands we can encounter following error:
    // "all shards failed: search_phase_execution_exception: [query_shard_exception] Reason: failed to create query: maxClauseCount is set to 2621"
    // That's why we chunk processing ids into pieces by size equals to MAX_RULES_IDS_IN_RETRY
    return (
      await pMap(
        chunk(ruleIdsWithConflictError, MAX_RULES_IDS_IN_RETRY),
        async (queryIds) =>
          handler({
            action,
            logger,
            bulkOperation,
            filter: convertRuleIdsToKueryNode(queryIds),
            accListSpecificForBulkOperation: newAccListSpecificForBulkOperation,
            accErrors: errors,
            accRules: rules,
            retries: retries - 1,
          }),
        {
          concurrency: 1,
        }
      )
    ).reduce(
      (acc, item) => {
        return {
          errors: [...acc.errors, ...item.errors],
          rules: [...acc.rules, ...item.rules],
          accListSpecificForBulkOperation: acc.accListSpecificForBulkOperation.map(
            (element, index) => [...element, ...item.accListSpecificForBulkOperation[index]]
          ),
        };
      },
      {
        errors: [],
        rules: [],
        accListSpecificForBulkOperation: Array.from(
          Array(accListSpecificForBulkOperation.length),
          () => []
        ),
      }
    );
  } catch (err) {
    throw err;
  }
};
