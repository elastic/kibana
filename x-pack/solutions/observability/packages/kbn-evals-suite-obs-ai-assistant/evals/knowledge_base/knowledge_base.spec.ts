/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';
import { testDocs } from '../../src/sample_data/knowledge_base';

/**
 * NOTE: This scenario has been migrated from the legacy evaluation framework.
 * - x-pack/solutions/observability/plugins/observability_ai_assistant_app/scripts/evaluation/scenarios/kb/index.spec.ts
 * Any changes should be made in both places until the legacy evaluation framework is removed.
 */

evaluate.describe('Knowledge base', { tag: tags.serverless.observability.complete }, () => {
  evaluate.beforeAll(async ({ knowledgeBaseClient }) => {
    await knowledgeBaseClient.ensureInstalled().catch((e) => {
      throw new Error(`Failed to install knowledge base: ${e.message}`);
    });
  });

  evaluate.describe('kb functions', () => {
    evaluate.afterEach(async ({ knowledgeBaseClient, conversationsClient }) => {
      await knowledgeBaseClient.clear();
      await conversationsClient.clear();
    });

    evaluate('summarizes information', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'kb: summarize',
          description: 'Tests the summarize function of the knowledge base',
          examples: [
            {
              input: {
                question:
                  'Remember that this cluster is used to test the AI Assistant using the Observability AI Evaluation Framework',
              },
              output: {
                criteria: [
                  'Calls the summarize function',
                  'Effectively summarizes that this cluster is used to test the AI Assistant using the Observability AI Evaluation Framework',
                  'The answer states that the information has been remembered',
                ],
              },
              metadata: {},
            },
          ],
        },
      });
    });

    evaluate('recalls information', async ({ knowledgeBaseClient, evaluateDataset }) => {
      await knowledgeBaseClient.importEntries({
        entries: [
          {
            id: 'cluster_purpose',
            title: 'Cluster Purpose',
            text: 'This cluster is used to test the AI Assistant using the Observability AI Evaluation Framework.',
          },
        ],
      });

      await evaluateDataset({
        dataset: {
          name: 'kb: recall',
          description: 'Tests the recall functions of the knowledge base',
          examples: [
            {
              input: {
                question: `What is this cluster used for?`,
              },
              output: {
                criteria: [
                  'Calls the "context" function to respond to What is this cluster used for?',
                  'Effectively recalls that this cluster is used to test the AI Assistant using the Observability AI Evaluation Framework',
                ],
              },
              metadata: {},
            },
          ],
        },
      });
    });
  });

  evaluate.describe('kb retrieval', () => {
    evaluate.beforeAll(async ({ knowledgeBaseClient }) => {
      await knowledgeBaseClient.importEntries({ entries: testDocs });
    });

    evaluate.afterAll(async ({ knowledgeBaseClient, conversationsClient }) => {
      await knowledgeBaseClient.clear();
      await conversationsClient.clear();
    });

    evaluate(
      'retrieves and describes information from the knowledge base',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'kb: retrieval',
            description: 'Tests retrieval of information from the knowledge base.',
            examples: [
              {
                input: {
                  question: 'What DevOps teams do we have and how is the on-call rotation managed?',
                },
                output: {
                  criteria: [
                    'Uses context function response to find information about ACME DevOps team structure',
                    "Correctly identifies all three teams: Platform Infrastructure, Application Operations, and Security Operations and describes each team's responsibilities",
                    'Mentions that on-call rotations are managed through PagerDuty and includes information about accessing the on-call schedule via Slack or Kibana',
                    'Does not invent unrelated or hallucinated details not present in the KB',
                  ],
                },
                metadata: {},
              },
              {
                input: {
                  question:
                    'What are our standard alert thresholds for services and what database technologies do we use?',
                },
                output: {
                  criteria: [
                    'Uses context function response to find the correct documents about alert thresholds and database infrastructure',
                    'Mentions the specific alert thresholds for API response time, error rate, CPU usage, and memory usage',
                    'Identifies the primary database technologies: PostgreSQL, MongoDB, and Redis and mentions that database metrics are collected via Metricbeat',
                    'Does not combine information incorrectly or hallucinate details not present in the KB',
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
