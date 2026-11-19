/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { LoadResult } from '@kbn/es-snapshot-loader';
import type { LogInsightParams } from '../../src/clients/ai_insight_client';
import {
  replayObservabilityDataStreams,
  cleanObservabilityDataStreams,
} from '../../src/data_generators/replay';
import { getLogScenarios, type LogScenario } from '../../src/scenarios/log_scenarios';
import { evaluate } from './evaluate_ai_insights';

const INDEX_REFRESH_WAIT_MS = 2500;

const scenarios = getLogScenarios();

for (const scenario of scenarios) {
  createScenarioTest(scenario);
}

function createScenarioTest(scenario: LogScenario) {
  evaluate.describe(
    `Log AI Insights - ${scenario.id} (${scenario.snapshotName})`,
    { tag: tags.serverless.observability.complete },
    () => {
      let logDocId: string;
      let logIndex: string;
      let replayResult: LoadResult;

      evaluate.beforeAll(async ({ esClient, log }) => {
        log.info(`Replaying scenario: ${scenario.id}`);
        replayResult = await replayObservabilityDataStreams(
          esClient,
          log,
          scenario.snapshotName,
          scenario.gcs
        );

        log.debug('Waiting to make sure all indices are refreshed');
        await new Promise((resolve) => setTimeout(resolve, INDEX_REFRESH_WAIT_MS));

        log.info(
          `Querying for log: service=${scenario.logQuery.serviceName}, pattern="${scenario.logQuery.messagePattern}"`
        );

        const logResponse = await esClient.search({
          index: scenario.logQuery.index,
          query: {
            bool: {
              filter: [{ term: { 'service.name': scenario.logQuery.serviceName } }],
              should: [
                { match_phrase: { message: scenario.logQuery.messagePattern } },
                { match_phrase: { 'exception.message': scenario.logQuery.messagePattern } },
              ],
              minimum_should_match: 1,
            },
          },
          sort: [{ '@timestamp': 'desc' }],
          size: 1,
          _source: false,
        });

        const logDoc = logResponse.hits.hits[0];
        if (!logDoc) {
          throw new Error(
            `No log found for scenario ${scenario.id} (service: ${scenario.logQuery.serviceName}, pattern: "${scenario.logQuery.messagePattern}")`
          );
        }

        if (!logDoc._id || !logDoc._index) {
          throw new Error(`Log document missing _id or _index for scenario ${scenario.id}`);
        }
        logDocId = logDoc._id;
        logIndex = logDoc._index;
        log.info(`Found log document: ${logIndex}/${logDocId}`);
      });

      evaluate(
        `Log AI insight correctness (${scenario.id}, ${scenario.snapshotName})`,
        async ({ aiInsightClient, evaluateDataset }) => {
          await evaluateDataset<LogInsightParams>({
            getInsight: (params) => aiInsightClient.getLogInsight(params),
            dataset: {
              name: `ai insights: log analysis (${scenario.id}, ${scenario.snapshotName})`,
              description: `Evaluates correctness of log AI insight summaries for ${scenario.id} (snapshot: ${scenario.snapshotName})`,
              examples: [
                {
                  input: {
                    requestPayload: {
                      index: logIndex,
                      id: logDocId,
                    },
                    question:
                      'Analyze this log entry and provide a summary explaining what it means, identify where it originated, assess the root cause and impact, and recommend next steps.',
                  },
                  output: {
                    expected: scenario.expectedOutput,
                  },
                },
              ],
            },
          });
        }
      );

      evaluate.afterAll(async ({ esClient, log }) => {
        log.debug('Cleaning up indices');
        await cleanObservabilityDataStreams(esClient, replayResult, log);
      });
    }
  );
}
