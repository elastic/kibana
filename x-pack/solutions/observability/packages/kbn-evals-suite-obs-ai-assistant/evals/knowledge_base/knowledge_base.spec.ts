/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluateKnowledgeBase } from './evaluate_knowledge_base';
import { createEvaluateKnowledgeBase } from './evaluate_knowledge_base';
import { evaluate as base } from '../../src/evaluate';

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
  // --- Tests for kb functions ---
  evaluate.describe('kb functions', () => {
    evaluate.afterEach(async ({ esClient }) => {
      await esClient.deleteByQuery({
        index: '.kibana-observability-ai-assistant-kb-*',
        ignore_unavailable: true,
        query: {
          match: {
            text: {
              query: '*Observability AI Evaluation Framework*',
            },
          },
        },
      });
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

  // --- Tests for kb retrieval ---
  evaluate.describe('kb retrieval', () => {
    const testDocs = [
      {
        id: 'acme_teams',
        title: 'ACME DevOps Team Structure',
        text: 'ACME maintains three primary DevOps teams: Platform Infrastructure (responsible for cloud infrastructure and Kubernetes clusters), Application Operations (responsible for application deployments and monitoring), and Security Operations (responsible for security monitoring and compliance). Each team maintains a separate on-call rotation accessible via PagerDuty. The current on-call schedule is available in the #oncall Slack channel or through the PagerDuty integration in Kibana.',
      },
      {
        id: 'acme_monitoring',
        title: 'Alert Thresholds',
        text: 'Standard alert thresholds for ACME services are: API response time > 500ms (warning) or > 1s (critical), error rate > 1% (warning) or > 5% (critical), CPU usage > 80% (warning) or > 90% (critical), memory usage > 85% (warning) or > 95% (critical). Custom thresholds for specific services are documented in the service runbooks stored in Confluence under the "Service Specifications" space.',
      },
      {
        id: 'acme_infra',
        title: 'Database Infrastructure',
        text: 'Primary transactional data is stored in PostgreSQL clusters with read replicas in each region. Customer metadata is stored in MongoDB with M40 clusters in each region. Caching layer uses Redis Enterprise Cloud with 15GB instances. All database metrics are collected via Metricbeat with custom dashboards available under "ACME Databases" in Kibana. Database performance alerts are configured to notify the DBA team via the #db-alerts Slack channel.',
      },
    ];

    evaluate.beforeAll(async ({ knowledgeBaseClient, esClient }) => {
      await knowledgeBaseClient.importEntries({ entries: testDocs });
    });

    evaluate.afterAll(async ({ esClient }) => {
      await esClient.deleteByQuery({
        index: '.kibana-observability-ai-assistant-kb-*',
        ignore_unavailable: true,
        query: {
          match: {
            text: 'ACME',
          },
        },
        refresh: true,
      });
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
