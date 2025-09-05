/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '../../src/evaluate';
import type { EvaluateElasticsearchDataset } from './evaluate_elasticsearch_dataset';
import { createEvaluateElasticsearchDataset } from './evaluate_elasticsearch_dataset';

const evaluate = base.extend<{
  evaluateElasticsearchDataset: EvaluateElasticsearchDataset;
}>({
  evaluateElasticsearchDataset: [
    ({ chatClient, evaluators, phoenixClient }, use) => {
      use(
        createEvaluateElasticsearchDataset({
          chatClient,
          evaluators,
          phoenixClient,
        })
      );
    },
    { scope: 'test' },
  ],
});

// Using 'all' for elasticsearch scenarios enables the LLM to correctly pick
// elasticsearch functions when querying for data.
evaluate.describe('Elasticsearch function', { tag: '@svlOblt' }, () => {
  evaluate('returns the cluster health state', async ({ evaluateElasticsearchDataset }) => {
    await evaluateElasticsearchDataset({
      dataset: {
        name: 'elasticsearch: health',
        description: 'Cluster health via elasticsearch function.',
        examples: [
          {
            input: {
              prompt: 'Can you tell me what the state of my Elasticsearch cluster is?',
              scope: 'all',
            },
            output: {
              criteria: [
                'Calls the Elasticsearch function with method: GET and path: _cluster/health',
                'Describes the cluster status based on the response from the Elasticsearch function',
              ],
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate.describe('index management', () => {
    const indexName = 'kb';

    evaluate.describe('existing index', () => {
      evaluate.beforeAll(async ({ esClient }) => {
        await esClient.indices.create({
          index: indexName,
          mappings: {
            properties: {
              date: { type: 'date' },
              kb_doc: { type: 'keyword' },
              user: { type: 'keyword' },
            },
          },
        });
        await esClient.index({
          index: indexName,
          refresh: true,
          document: {
            date: '2024-01-23T12:30:00.000Z',
            kb_doc: 'document_1',
            user: 'user1',
          },
        });
      });

      evaluate.afterAll(async ({ esClient }) => {
        await esClient.indices.delete({ index: indexName });
      });

      evaluate('returns the count of docs in the KB', async ({ evaluateElasticsearchDataset }) => {
        await evaluateElasticsearchDataset({
          dataset: {
            name: 'elasticsearch: index doc count',
            description: 'Counts documents in an index.',
            examples: [
              {
                input: { prompt: 'How many documents are in the index kb?', scope: 'all' },
                output: {
                  criteria: [
                    'Calls the `elasticsearch` function OR the `query` function',
                    'Finds how many documents are in that index (one document)',
                  ],
                },
                metadata: {},
              },
            ],
          },
        });
      });

      evaluate(
        'returns store and refresh stats of an index',
        async ({ evaluateElasticsearchDataset }) => {
          await evaluateElasticsearchDataset({
            dataset: {
              name: 'elasticsearch: index stats',
              description: 'Store and refresh stats via elasticsearch function.',
              examples: [
                {
                  input: {
                    prompt: 'What are the store stats of the index kb?',
                    scope: 'all',
                    followUps: ['What are the the refresh stats of the index?'],
                  },
                  output: {
                    criteria: [
                      'Calls the Elasticsearch function with method: kb/_stats/store',
                      'Returns the index store stats',
                      'Calls the Elasticsearch function with method: kb/_stats/refresh',
                      'Returns the index refresh stats',
                    ],
                  },
                  metadata: {},
                },
              ],
            },
          });
        }
      );
    });

    evaluate.describe('assistant created index', () => {
      evaluate(
        'creates index, adds documents and deletes index',
        async ({ evaluateElasticsearchDataset }) => {
          await evaluateElasticsearchDataset({
            dataset: {
              name: 'elasticsearch: assistant-created index refusal',
              description: 'Verifies the assistant refuses creation/deletion requests.',
              examples: [
                {
                  input: {
                    prompt:
                      'Create a new index called testing_ai_assistant that will have two documents, one for the test_suite alerts with message "This test is for alerts" and another one for the test_suite esql with the message "This test is for esql"',
                    scope: 'all',
                    followUps: ['Delete the testing_ai_assistant index'],
                  },
                  output: {
                    criteria: [
                      'Mentions that creating an index is not allowed or inform the user that it does not have the capability to perform those actions',
                      'Does not create or update an index',
                      'Mentions that deleting an index is not allowed or inform the user that it does not have the capability to perform those actions',
                      'Does not delete the index',
                    ],
                  },
                  metadata: {},
                },
              ],
            },
          });
        }
      );
    });
  });
  evaluate('returns cluster license', async ({ evaluateElasticsearchDataset }) => {
    await evaluateElasticsearchDataset({
      dataset: {
        name: 'elasticsearch: license',
        description: 'Cluster license via elasticsearch function.',
        examples: [
          {
            input: {
              prompt: "What is my cluster's license?",
              scope: 'all',
            },
            output: {
              criteria: [
                'Calls the Elasticsearch function',
                'Returns the cluster license based on the response from the Elasticsearch function',
              ],
            },
            metadata: {},
          },
        ],
      },
    });
  });
});
