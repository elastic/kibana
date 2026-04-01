/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import moment from 'moment';
import type { LoadResult } from '@kbn/es-snapshot-loader';
import type { ErrorInsightParams } from '../../src/clients/ai_insight_client';
import {
  replayObservabilityDataStreams,
  cleanObservabilityDataStreams,
} from '../../src/data_generators/replay';
import { getErrorScenarios, type ApmErrorScenario } from '../../src/scenarios/error_scenarios';
import type { ApmErrorIdSearchFields } from '../../src/scenarios/types';
import { evaluate } from './evaluate_ai_insights';

const INDEX_REFRESH_WAIT_MS = 2500;

const scenarios = getErrorScenarios();

for (const scenario of scenarios) {
  createScenarioTest(scenario);
}

function createScenarioTest(scenario: ApmErrorScenario) {
  evaluate.describe(
    `APM Error AI Insights - ${scenario.id} (${scenario.snapshotName})`,
    { tag: tags.serverless.observability.complete },
    () => {
      let errorId: string;
      let start: string;
      let end: string;
      let replayResult: LoadResult;

      evaluate.beforeAll(async ({ esClient, log }) => {
        end = moment().toISOString();
        start = moment().subtract(15, 'minutes').toISOString();

        log.info(`Replaying scenario: ${scenario.id}`);
        replayResult = await replayObservabilityDataStreams(
          esClient,
          log,
          scenario.snapshotName,
          scenario.gcs
        );

        log.debug('Waiting to make sure all indices are refreshed');
        await new Promise((resolve) => setTimeout(resolve, INDEX_REFRESH_WAIT_MS));

        log.info(`Querying for APM error: ${scenario.errorQuery.errorMessage}`);
        const errorsResponse = await esClient.search({
          index: 'logs-*',
          query: {
            bool: {
              filter: [
                { term: { 'service.name': scenario.errorQuery.serviceName } },
                { term: { 'event.name': 'exception' } },
                {
                  match_phrase: {
                    'error.grouping_name': scenario.errorQuery.errorMessage,
                  },
                },
              ],
            },
          },
          sort: [{ '@timestamp': 'desc' }],
          size: 1,
          fields: ['error.id'],
          _source: false,
        });

        const errorDoc = errorsResponse.hits.hits[0];
        if (!errorDoc) {
          throw new Error(
            `No APM error found for scenario ${scenario.id} (service: ${scenario.errorQuery.serviceName})`
          );
        }

        const fields: ApmErrorIdSearchFields = errorDoc.fields ?? {};
        const resolvedErrorId = fields['error.id']?.[0] ?? errorDoc._id;
        if (resolvedErrorId === undefined) {
          throw new Error(
            `No APM error found for scenario ${scenario.id} (service: ${scenario.errorQuery.serviceName})`
          );
        }
        errorId = resolvedErrorId;
        log.info(`Found APM error with ID: ${errorId}`);
      });

      evaluate(
        `APM error AI insight correctness (${scenario.id}, ${scenario.snapshotName})`,
        async ({ aiInsightClient, evaluateDataset }) => {
          await evaluateDataset<ErrorInsightParams>({
            getInsight: (params) => aiInsightClient.getErrorInsight(params),
            dataset: {
              name: `ai insights: APM error analysis (${scenario.id}, ${scenario.snapshotName})`,
              description: `Evaluates correctness of APM error AI insight summaries for ${scenario.id} (snapshot: ${scenario.snapshotName})`,
              examples: [
                {
                  input: {
                    requestPayload: {
                      errorId,
                      serviceName: scenario.errorQuery.serviceName,
                      start,
                      end,
                    },
                    question:
                      'Analyze this APM error and provide an error summary, identify where the failure occurred (application code vs dependency), assess the impact and scope, and recommend 2-4 immediate actions.',
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
