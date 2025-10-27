/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate } from '../../src/evaluate';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type {
  InstallationStatusResponse,
  PerformInstallResponse,
  UninstallResponse,
} from '@kbn/product-doc-base-plugin/common/http_api/installation';
import { testDocs } from '../../src/sample_data/knowledge_base';

/**
 * NOTE: This scenario has been migrated from the legacy evaluation framework.
 * - x-pack/solutions/observability/plugins/observability_ai_assistant_app/scripts/evaluation/scenarios/kb/index.spec.ts
 * Any changes should be made in both places until the legacy evaluation framework is removed.
 */

const ELASTIC_DOCS_INSTALLATION_STATUS_API_PATH = '/internal/product_doc_base/status';
const ELASTIC_DOCS_INSTALL_ALL_API_PATH = '/internal/product_doc_base/install';
const ELASTIC_DOCS_UNINSTALL_ALL_API_PATH = '/internal/product_doc_base/uninstall';
const inferenceId = defaultInferenceEndpoints.ELSER;
const RETRIEVE_ELASTIC_DOC_FUNCTION_NAME = 'retrieve_elastic_doc';

evaluate.describe('Knowledge base', { tag: '@svlOblt' }, () => {
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

  evaluate.describe('kb source isolation (Lens)', () => {
    evaluate.beforeEach(async ({ knowledgeBaseClient, kbnClient, log }) => {
      await knowledgeBaseClient.importEntries({
        entries: [
          {
            id: 'lens_internal_policy',
            title: 'Lens: Internal Usage & Best Practices (ACME)',
            text:
              'Internal-only: Lens is ACME’s standard tool for observability dashboards.\n' +
              'Access: Only Observability Admins edit shared templates; team Editors manage dashboards in team spaces.\n' +
              'Naming: <team>::<service>::<purpose>.\n' +
              'Required tags: owner, env, data_domain, pii_level, retention_days.\n' +
              'Data views: "acme-*", "metrics-acme-*", "logs-acme-*".\n' +
              'Prod dashboards require env:prod filter; default time 24h; refresh ≥ 30s.\n' +
              'PII fields (*_email, *_user_id) must be masked. Include Data Health embeddable.\n' +
              'Use company palette; red reserved for SLA/SLO breach; max 10 visualizations.\n',
          },
        ],
      });
      const { data: status } = await kbnClient.request<InstallationStatusResponse>({
        method: 'GET',
        path: `${ELASTIC_DOCS_INSTALLATION_STATUS_API_PATH}?inferenceId=${encodeURIComponent(
          inferenceId
        )}`,
      });
      if (status.overall === 'installed') {
        log.success('Elastic documentation is already installed');
      } else {
        log.info('Installing Elastic documentation');
        const { data: installResponse } = await kbnClient.request<PerformInstallResponse>({
          method: 'POST',
          path: ELASTIC_DOCS_INSTALL_ALL_API_PATH,
          body: { inferenceId },
        });

        if (!installResponse.installed) {
          log.error('Could not install Elastic documentation');
          throw new Error('Documentation did not install successfully before running tests.');
        }

        const { data: installStatus } = await kbnClient.request<InstallationStatusResponse>({
          method: 'GET',
          path: `${ELASTIC_DOCS_INSTALLATION_STATUS_API_PATH}?inferenceId=${encodeURIComponent(
            inferenceId
          )}`,
        });
        if (installStatus.overall !== 'installed') {
          throw new Error('Documentation is not fully installed, cannot proceed with tests.');
        }
      }
    });

    evaluate.afterEach(async ({ knowledgeBaseClient, conversationsClient, kbnClient, log }) => {
      await knowledgeBaseClient.clear();
      await conversationsClient.clear();
      log.info('Uninstalling Elastic documentation');
      const { data: uninstallResponse } = await kbnClient.request<UninstallResponse>({
        method: 'POST',
        path: ELASTIC_DOCS_UNINSTALL_ALL_API_PATH,
        body: { inferenceId },
      });

      if (uninstallResponse.success) {
        log.success('Uninstalled Elastic documentation');
      } else {
        log.error('Could not uninstall Elastic documentation');
      }
    });

    evaluate(
      'returns information ONLY from the internal knowledge base for internal Lens usage questions',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'kb: source isolation',
            description:
              'Queries about internal Lens governance should retrieve only internal entries, excluding product docs.',
            examples: [
              {
                input: {
                  question:
                    'What are our internal Lens rules for production dashboards (naming, required tags, allowed data views, and minimum refresh)?',
                },
                output: {
                  criteria: [
                    'Retrieves the internal policy entry (id "lens_internal_policy").',
                    'Mentions naming format <team>::<service>::<purpose>, required tags (owner, env, data_domain, pii_level, retention_days).',
                    'Mentions allowed data views ("acme-*", "metrics-acme-*", "logs-acme-*"), default time 24h, and refresh ≥ 30s.',
                    'Does not use function retrieve_elastic_doc before answering the question about internal Lens policies.',
                    'Does not hallucinate details that are not present in the internal policy.',
                  ],
                },
                metadata: {},
              },
              {
                input: {
                  question:
                    'Summarize our security/PII rules for Lens dashboards and the visualization standards used in prod.',
                },
                output: {
                  criteria: [
                    'Uses context function response to retrieve information ONLY from the internal policy',
                    `Does not use function ${RETRIEVE_ELASTIC_DOC_FUNCTION_NAME}  before answering the question about internal Lens policies.`,
                    'Mentions masking PII fields (e.g., *_email, *_user_id), use of company color palette, red for SLA/SLO breaches, and Data Health embeddable.',
                  ],
                },
                metadata: {},
              },
            ],
          },
        });
      }
    );

    evaluate('retrieves Kibana documentation', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'documentation: kibana lens',
          description: 'Validates retrieve_elastic_doc usage for Kibana Lens guidance.',
          examples: [
            {
              input: {
                question:
                  'What is Kibana Lens and how do I create a bar chart visualization with it?',
              },
              output: {
                criteria: [
                  'Does not use context function response to retrieve information about Kibana Lens',
                  `Uses the ${RETRIEVE_ELASTIC_DOC_FUNCTION_NAME} function before answering the question about Kibana`,
                  'Accurately explains what Kibana Lens is and provides steps for creating a visualization',
                  `Any additional information beyond the retrieved documentation must be factually accurate and relevant to the user's question`,
                ],
              },
              metadata: {},
            },
          ],
        },
      });
    });
  });
});
