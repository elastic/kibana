/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluateKnowledgeBase } from './evaluate_knowledge_base';
import { createEvaluateKnowledgeBase } from './evaluate_knowledge_base';
import { evaluate as base } from '../../src/evaluate';
import { clearConversations } from '../utils/conversation';
import { clearKnowledgeBase, testDocs } from '../utils/knowledge_base';

/**
 * NOTE: This scenario has been migrated from the legacy evaluation framework.
 * - x-pack/solutions/observability/plugins/observability_ai_assistant_app/scripts/evaluation/scenarios/kb/index.spec.ts
 * Any changes should be made in both places until the legacy evaluation framework is removed.
 */

const evaluate = base.extend<{
  evaluateKnowledgeBase: EvaluateKnowledgeBase;
}>({
  evaluateKnowledgeBase: [
    ({ knowledgeBaseClient, chatClient, evaluators, phoenixClient }, use) => {
      use(
        createEvaluateKnowledgeBase({
          chatClient,
          evaluators,
          phoenixClient,
          knowledgeBaseClient,
        })
      );
    },
    { scope: 'test' },
  ],
});

evaluate.describe('Knowledge base', { tag: '@svlOblt' }, () => {
  evaluate.describe('kb functions', () => {
    evaluate.afterEach(async ({ esClient }) => {
      await clearKnowledgeBase(esClient);
      await clearConversations(esClient);
    });

    evaluate('summarizes information', async ({ evaluateKnowledgeBase }) => {
      await evaluateKnowledgeBase({
        dataset: {
          name: 'kb_functions_summarize',
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
    evaluate('recalls information', async ({ knowledgeBaseClient, evaluateKnowledgeBase }) => {
      await knowledgeBaseClient.importEntries({
        entries: [
          {
            id: 'cluster_purpose',
            title: 'Cluster Purpose',
            text: 'This cluster is used to test the AI Assistant using the Observability AI Evaluation Framework.',
          },
        ],
      });
      await evaluateKnowledgeBase({
        dataset: {
          name: 'kb_functions_recall',
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

    evaluate.afterAll(async ({ esClient }) => {
      await clearKnowledgeBase(esClient);
      await clearConversations(esClient);
    });

    evaluate('retrieves one entry from the KB without LLM', async ({ chatClient }) => {
      const conversation = await chatClient.complete({
        messages: 'What DevOps teams do we have and how is the on-call rotation managed?',
      });
      const contextResponseMessage = conversation.messages.find((msg) => msg.name === 'context');
      if (!contextResponseMessage) {
        throw new Error('No context function message returned');
      }

      const { learnings } = JSON.parse(contextResponseMessage.content!);
      const firstLearning = learnings[0];

      if (learnings.length < 1) {
        throw new Error(`Expected at least 1 learning`);
      }

      if (!(firstLearning.llmScore > 4)) {
        throw new Error(`Expected LLM score > 4, got ${firstLearning.llmScore}`);
      }

      if (firstLearning.id !== 'acme_teams') {
        throw new Error(`Expected first learning id "acme_teams", got "${firstLearning.id}"`);
      }
    });

    evaluate(
      'retrieves and describes DevOps teams and on-call info',
      async ({ evaluateKnowledgeBase }) => {
        await evaluateKnowledgeBase({
          dataset: {
            name: 'kb_retrieval_devops',
            description:
              'Tests retrieval of DevOps team and on-call information from the knowledge base.',
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
            ],
          },
        });
      }
    );

    evaluate(
      'retrieves monitoring thresholds and database infrastructure details',
      async ({ evaluateKnowledgeBase }) => {
        await evaluateKnowledgeBase({
          dataset: {
            name: 'kb_retrieval_monitoring_db',
            description:
              'Tests retrieval of monitoring thresholds and database infrastructure details.',
            examples: [
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
