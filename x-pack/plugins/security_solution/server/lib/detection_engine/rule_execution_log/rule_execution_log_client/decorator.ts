/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import { Logger } from 'src/core/server';
import { initPromisePool } from '../../../../utils/promise_pool';

import { IRuleExecutionLogClient } from './client_interface';

const RULES_PER_CHUNK = 1000;

export const decorateRuleExecutionLogClient = (
  client: IRuleExecutionLogClient,
  logger: Logger
): IRuleExecutionLogClient => {
  return {
    /**
     * Get the current rule execution summary for each of the given rule IDs.
     * This method splits work into chunks so not to owerwhelm Elasticsearch
     * when fetching statuses for a big number of rules.
     *
     * @param ruleIds A list of rule IDs (`rule.id`) to fetch summaries for
     * @returns A dict with rule IDs as keys and execution summaries as values
     *
     * @throws AggregateError if any of the rule status requests fail
     */
    async getExecutionSummariesBulk(ruleIds) {
      const { results, errors } = await initPromisePool({
        concurrency: 1,
        items: chunk(ruleIds, RULES_PER_CHUNK),
        executor: (ruleIdsChunk) =>
          client.getExecutionSummariesBulk(ruleIdsChunk).catch((e) => {
            logger.error(
              `Error fetching rule execution summaries: ${e instanceof Error ? e.stack : String(e)}`
            );
            throw e;
          }),
      });

      if (errors.length) {
        throw new AggregateError(errors, 'Error fetching rule execution summaries');
      }

      // Merge all rule statuses into a single dict
      return Object.assign({}, ...results);
    },

    getExecutionSummary(ruleId) {
      return client.getExecutionSummary(ruleId);
    },

    clearExecutionSummary(ruleId) {
      return client.clearExecutionSummary(ruleId);
    },

    getLastFailures(ruleId) {
      return client.getLastFailures(ruleId);
    },
  };
};
