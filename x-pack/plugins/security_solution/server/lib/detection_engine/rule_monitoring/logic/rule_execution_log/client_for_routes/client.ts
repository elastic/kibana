/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk, mapValues } from 'lodash';
import type { Logger } from '@kbn/core/server';
import { initPromisePool } from '../../../../../../utils/promise_pool';
import { withSecuritySpan } from '../../../../../../utils/with_security_span';
import type { ExtMeta } from '../utils/console_logging';
import { truncateList } from '../utils/normalization';

import type {
  GetRuleExecutionEventsResponse,
  GetRuleExecutionResultsResponse,
  RuleExecutionSummary,
} from '../../../../../../../common/detection_engine/rule_monitoring';

import type { IEventLogReader } from '../event_log/event_log_reader';
import type { IRuleExecutionSavedObjectsClient } from '../execution_saved_object/saved_objects_client';
import type {
  GetExecutionEventsArgs,
  GetExecutionResultsArgs,
  IRuleExecutionLogForRoutes,
  RuleExecutionSummariesByRuleId,
} from './client_interface';

const RULES_PER_CHUNK = 1000;

export const createClientForRoutes = (
  soClient: IRuleExecutionSavedObjectsClient,
  eventLog: IEventLogReader,
  logger: Logger
): IRuleExecutionLogForRoutes => {
  return {
    getExecutionSummariesBulk: (ruleIds: string[]): Promise<RuleExecutionSummariesByRuleId> => {
      return withSecuritySpan('IRuleExecutionLogForRoutes.getExecutionSummariesBulk', async () => {
        try {
          // This method splits work into chunks so not to overwhelm Elasticsearch
          // when fetching statuses for a big number of rules.
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
                const logReason = e instanceof Error ? e.stack ?? e.message : String(e);
                const logSuffix = `[${ruleIdsChunk.length} rules][rule ids: ${ruleIdsString}]`;

                logger.error(`${logMessage}: ${logReason} ${logSuffix}`);
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
          const logReason = e instanceof Error ? e.message : String(e);
          const logSuffix = `[${ruleIds.length} rules][rule ids: ${ruleIdsString}]`;

          logger.error(`${logMessage}: ${logReason} ${logSuffix}`);
          throw e;
        }
      });
    },

    getExecutionSummary: (ruleId: string): Promise<RuleExecutionSummary | null> => {
      return withSecuritySpan('IRuleExecutionLogForRoutes.getExecutionSummary', async () => {
        try {
          const savedObject = await soClient.getOneByRuleId(ruleId);
          return savedObject ? savedObject.attributes : null;
        } catch (e) {
          const logMessage = 'Error getting rule execution summary';
          const logReason = e instanceof Error ? e.message : String(e);
          const logSuffix = `[rule id ${ruleId}]`;
          const logMeta: ExtMeta = {
            rule: { id: ruleId },
          };

          logger.error(`${logMessage}: ${logReason} ${logSuffix}`, logMeta);
          throw e;
        }
      });
    },

    clearExecutionSummary: (ruleId: string): Promise<void> => {
      return withSecuritySpan('IRuleExecutionLogForRoutes.clearExecutionSummary', async () => {
        try {
          await soClient.delete(ruleId);
        } catch (e) {
          const logMessage = 'Error clearing rule execution summary';
          const logReason = e instanceof Error ? e.message : String(e);
          const logSuffix = `[rule id ${ruleId}]`;
          const logMeta: ExtMeta = {
            rule: { id: ruleId },
          };

          logger.error(`${logMessage}: ${logReason} ${logSuffix}`, logMeta);
          throw e;
        }
      });
    },

    getExecutionEvents: (args: GetExecutionEventsArgs): Promise<GetRuleExecutionEventsResponse> => {
      return withSecuritySpan('IRuleExecutionLogForRoutes.getExecutionEvents', async () => {
        const { ruleId } = args;
        try {
          return await eventLog.getExecutionEvents(args);
        } catch (e) {
          const logMessage = 'Error getting plain execution events from event log';
          const logReason = e instanceof Error ? e.message : String(e);
          const logSuffix = `[rule id ${ruleId}]`;
          const logMeta: ExtMeta = {
            rule: { id: ruleId },
          };

          logger.error(`${logMessage}: ${logReason} ${logSuffix}`, logMeta);
          throw e;
        }
      });
    },

    getExecutionResults: (
      args: GetExecutionResultsArgs
    ): Promise<GetRuleExecutionResultsResponse> => {
      return withSecuritySpan('IRuleExecutionLogForRoutes.getExecutionResults', async () => {
        const { ruleId } = args;
        try {
          return await eventLog.getExecutionResults(args);
        } catch (e) {
          const logMessage = 'Error getting aggregate execution results from event log';
          const logReason = e instanceof Error ? e.message : String(e);
          const logSuffix = `[rule id ${ruleId}]`;
          const logMeta: ExtMeta = {
            rule: { id: ruleId },
          };

          logger.error(`${logMessage}: ${logReason} ${logSuffix}`, logMeta);
          throw e;
        }
      });
    },
  };
};
