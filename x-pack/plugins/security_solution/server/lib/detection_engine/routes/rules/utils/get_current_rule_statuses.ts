/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import { Logger } from 'src/core/server';
import { initPromisePool } from '../../../../../utils/promise_pool';
import { GetCurrentStatusBulkResult, IRuleExecutionLogClient } from '../../../rule_execution_log';

const RULES_PER_CHUNK = 1000;

interface GetCurrentRuleStatusesArgs {
  ruleIds: string[];
  execLogClient: IRuleExecutionLogClient;
  spaceId: string;
  logger: Logger;
}

/**
 * Get the most recent execution status for each of the given rule IDs.
 * This method splits work into chunks so not to owerwhelm Elasticsearch
 * when fetching statuses for a big number of rules.
 *
 * @param ruleIds Rule IDs to fetch statuses for
 * @param execLogClient RuleExecutionLogClient
 * @param spaceId Current Space ID
 * @param logger Logger
 * @returns A dict with rule IDs as keys and rule statuses as values
 *
 * @throws AggregateError if any of the rule status requests fail
 */
export async function getCurrentRuleStatuses({
  ruleIds,
  execLogClient,
  spaceId,
  logger,
}: GetCurrentRuleStatusesArgs): Promise<GetCurrentStatusBulkResult> {
  const { results, errors } = await initPromisePool({
    concurrency: 1,
    items: chunk(ruleIds, RULES_PER_CHUNK),
    executor: (ruleIdsChunk) =>
      execLogClient
        .getCurrentStatusBulk({
          ruleIds: ruleIdsChunk,
          spaceId,
        })
        .catch((error) => {
          logger.error(
            `Error fetching rule status: ${error instanceof Error ? error.message : String(error)}`
          );
          throw error;
        }),
  });

  if (errors.length) {
    throw new AggregateError(errors, 'Error fetching rule statuses');
  }

  // Merge all rule statuses into a single dict
  return Object.assign({}, ...results);
}
