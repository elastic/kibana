/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk, mapValues } from 'lodash';
import { Logger } from 'src/core/server';
import { initPromisePool } from '../../../../utils/promise_pool';
import { withSecuritySpan } from '../../../../utils/with_security_span';

import { RuleExecutionStatus } from '../../../../../common/detection_engine/schemas/common';

import { IEventLogReader } from '../event_log/event_log_reader';
import { IRuleExecutionSavedObjectsClient } from '../execution_saved_object/saved_objects_client';
import { IRuleExecutionLogForRoutes } from './client_interface';

import { ExtMeta } from '../utils/console_logging';
import { truncateList } from '../utils/normalization';

const RULES_PER_CHUNK = 1000;
const MAX_LAST_FAILURES = 5;

export const createClientForRoutes = (
  soClient: IRuleExecutionSavedObjectsClient,
  eventLog: IEventLogReader,
  logger: Logger
): IRuleExecutionLogForRoutes => {
  return {
    /**
     * Get the current rule execution summary for each of the given rule IDs.
     * This method splits work into chunks so not to overwhelm Elasticsearch
     * when fetching statuses for a big number of rules.
     *
     * @param ruleIds A list of rule IDs (`rule.id`) to fetch summaries for
     * @returns A dict with rule IDs as keys and execution summaries as values
     *
     * @throws AggregateError if any of the rule status requests fail
     */
    getExecutionSummariesBulk(ruleIds) {
      return withSecuritySpan('IRuleExecutionLogForRoutes.getExecutionSummariesBulk', async () => {
        try {
          const ruleIdsChunks = chunk(ruleIds, RULES_PER_CHUNK);

          const { results, errors } = await initPromisePool({
            concurrency: 1,
            items: ruleIdsChunks,
            executor: async (ruleIdsChunk) => {
              try {
                const savedObjectsByRuleId = await soClient.getManyByRuleIds(ruleIdsChunk);
                return mapValues(savedObjectsByRuleId, (so) => so?.attributes ?? null);
              } catch (e) {
                const ruleIdsString = `[${truncateList(ruleIdsChunk).join(', ')}]`;

                const logMessage = 'Error fetching a chunk of rule execution saved objects';
                const logAttributes = `num of rules: ${ruleIdsChunk.length}, rule ids: ${ruleIdsString}`;
                const logReason = e instanceof Error ? e.stack ?? e.message : String(e);

                logger.error(`${logMessage}; ${logAttributes}; ${logReason}`);
                throw e;
              }
            },
          });

          if (errors.length) {
            const numAllChunks = ruleIdsChunks.length;
            const numFailedChunks = errors.length;
            const message = `Error fetching rule execution saved objects in chunks: ${numFailedChunks}/${numAllChunks} chunks failed`;
            throw new AggregateError(errors, message);
          }

          // Merge all rule statuses into a single dict
          return Object.assign({}, ...results.map(({ result }) => result));
        } catch (e) {
          const ruleIdsString = `[${truncateList(ruleIds).join(', ')}]`;

          const logMessage = 'Error bulk getting rule execution summaries';
          const logAttributes = `num of rules: ${ruleIds.length}, rule ids: ${ruleIdsString}`;
          const logReason = e instanceof Error ? e.message : String(e);

          logger.error(`${logMessage}; ${logAttributes}; ${logReason}`);
          throw e;
        }
      });
    },

    getExecutionSummary(ruleId) {
      return withSecuritySpan('IRuleExecutionLogForRoutes.getExecutionSummary', async () => {
        try {
          const savedObject = await soClient.getOneByRuleId(ruleId);
          return savedObject ? savedObject.attributes : null;
        } catch (e) {
          const logMessage = 'Error getting rule execution summary';
          const logAttributes = `rule id: "${ruleId}"`;
          const logReason = e instanceof Error ? e.message : String(e);
          const logMeta: ExtMeta = {
            rule: { id: ruleId },
          };

          logger.error<ExtMeta>(`${logMessage}; ${logAttributes}; ${logReason}`, logMeta);
          throw e;
        }
      });
    },

    clearExecutionSummary(ruleId) {
      return withSecuritySpan('IRuleExecutionLogForRoutes.clearExecutionSummary', async () => {
        try {
          await soClient.delete(ruleId);
        } catch (e) {
          const logMessage = 'Error clearing rule execution summary';
          const logAttributes = `rule id: "${ruleId}"`;
          const logReason = e instanceof Error ? e.message : String(e);
          const logMeta: ExtMeta = {
            rule: { id: ruleId },
          };

          logger.error<ExtMeta>(`${logMessage}; ${logAttributes}; ${logReason}`, logMeta);
          throw e;
        }
      });
    },

    getLastFailures(ruleId) {
      return withSecuritySpan('IRuleExecutionLogForRoutes.getLastFailures', async () => {
        try {
          return await eventLog.getLastStatusChanges({
            ruleId,
            count: MAX_LAST_FAILURES,
            includeStatuses: [RuleExecutionStatus.failed],
          });
        } catch (e) {
          const logMessage = 'Error getting last execution failures from event log';
          const logAttributes = `rule id: "${ruleId}"`;
          const logReason = e instanceof Error ? e.message : String(e);
          const logMeta: ExtMeta = {
            rule: { id: ruleId },
          };

          logger.error<ExtMeta>(`${logMessage}; ${logAttributes}; ${logReason}`, logMeta);
          throw e;
        }
      });
    },
  };
};
