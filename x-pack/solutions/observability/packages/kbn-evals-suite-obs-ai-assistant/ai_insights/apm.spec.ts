/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import moment from 'moment';
import {
  evaluate as base,
  createQuantitativeCorrectnessEvaluators,
  type DefaultEvaluators,
  type EvaluationDataset,
  type KibanaPhoenixClient,
} from '@kbn/evals';
import { AiInsightClient, type ErrorInsightParams } from '../src/clients/ai_insight_client';
import {
  OTEL_DEMO_SNAPSHOT_NAME,
  replayObservabilityDataStreams,
  cleanObservabilityDataStreams,
} from '../src/data_generators/replay';

const INDEX_REFRESH_WAIT_MS = 2500;

interface ErrorAiInsightExample extends Example {
  input: {
    errorId: string;
    serviceName: string;
    start: string;
    end: string;
    environment?: string;
  };
  output: {
    expected: string;
  };
}

type EvaluateErrorAiInsightsDataset = (params: {
  dataset: {
    name: string;
    description: string;
    examples: ErrorAiInsightExample[];
  };
}) => Promise<void>;

function createEvaluateErrorAiInsightsDataset({
  aiInsightClient,
  evaluators,
  phoenixClient,
}: {
  aiInsightClient: AiInsightClient;
  evaluators: DefaultEvaluators;
  phoenixClient: KibanaPhoenixClient;
}): EvaluateErrorAiInsightsDataset {
  return async function evaluateErrorAiInsightsDataset({
    dataset: { name, description, examples },
  }) {
    const dataset = {
      name,
      description,
      examples,
    } satisfies EvaluationDataset;

    await phoenixClient.runExperiment(
      {
        dataset,
        task: async ({ input, output, metadata }) => {
          const response = await aiInsightClient.getErrorInsight(input as ErrorInsightParams);

          const correctnessResult = await evaluators.correctnessAnalysis().evaluate({
            input,
            expected: { expected: output.expected },
            output: {
              messages: [{ message: response.summary }],
            },
            metadata,
          });

          return {
            summary: response.summary,
            context: response.context,
            correctnessAnalysis: correctnessResult?.metadata,
          };
        },
      },
      createQuantitativeCorrectnessEvaluators()
    );
  };
}

const evaluate = base.extend<{}, { evaluateDataset: EvaluateErrorAiInsightsDataset }>({
  evaluateDataset: [
    ({ fetch, evaluators, phoenixClient }, use) => {
      const aiInsightClient = new AiInsightClient(fetch);

      use(
        createEvaluateErrorAiInsightsDataset({
          aiInsightClient,
          evaluators,
          phoenixClient,
        })
      );
    },
    { scope: 'worker' },
  ],
});

evaluate.describe('APM Error AI Insights', { tag: '@svlOblt' }, () => {
  let errorId: string;
  const serviceName = 'payment';
  let start: string;
  let end: string;

  evaluate.beforeAll(async ({ esClient, log }) => {
    end = moment().toISOString();
    start = moment().subtract(15, 'minutes').toISOString();

    await replayObservabilityDataStreams(esClient, log, OTEL_DEMO_SNAPSHOT_NAME);

    log.debug('Waiting to make sure all indices are refreshed');
    await new Promise((resolve) => setTimeout(resolve, INDEX_REFRESH_WAIT_MS));

    log.info('Querying for APM error ID');
    const errorsResponse = await esClient.search({
      index: 'logs-*',
      query: {
        bool: {
          filter: [
            { term: { 'error.exception.type': 'Error' } },
            {
              term: {
                'error.exception.message':
                  'Payment request failed. Invalid token. app.loyalty.level=gold',
              },
            },
            { term: { 'service.name': serviceName } },
          ],
        },
      },
      sort: [{ '@timestamp': 'desc' }],
      size: 1,
      _source: ['error.id', 'service.name', '@timestamp'],
    });

    const errorDoc = errorsResponse.hits.hits[0];
    if (!errorDoc) {
      throw new Error(`No APM error found for service ${serviceName}`);
    }

    const source = errorDoc._source as { error?: { id?: string } };
    errorId = source?.error?.id ?? (errorDoc._id as string);
    log.info(`Found APM error with ID: ${errorId}`);
  });

  evaluate('error analysis correctness', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'ai insights: APM error analysis',
        description: 'Evaluates correctness of APM error AI insight summaries against ground truth',
        examples: [
          {
            input: {
              errorId,
              serviceName,
              start,
              end,
            },
            output: {
              expected: `The error analysis shows a failure in the payment service.
Key observations:
- Service affected: payment
- Error type and message indicate a payment processing failure
- The error is linked to a specific transaction or span in the distributed trace
Immediate actions:
- Check downstream dependencies for connectivity issues
- Review error stack traces for root cause
- Verify payment gateway or external service availability`,
            },
          },
        ],
      },
    });
  });

  evaluate.afterAll(async ({ esClient, log }) => {
    log.debug('Cleaning up indices');
    await cleanObservabilityDataStreams(esClient);
  });
});
