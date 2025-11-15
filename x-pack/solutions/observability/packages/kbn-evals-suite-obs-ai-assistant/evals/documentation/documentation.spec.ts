/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RETRIEVE_ELASTIC_DOC_FUNCTION_NAME } from '@kbn/observability-ai-assistant-plugin/server';
import { evaluate } from '../../src/evaluate';

/**
 * NOTE: This scenario has been migrated from the legacy evaluation framework.
 * - x-pack/solutions/observability/plugins/observability_ai_assistant_app/scripts/evaluation/scenarios/documentation/index.spec.ts
 * Any changes should be made in both places until the legacy evaluation framework is removed.
 */

evaluate.describe('Retrieve documentation function', { tag: '@svlOblt' }, () => {
  evaluate.beforeAll(async ({ documentationClient }) => {
    await documentationClient.ensureInstalled();
  });

  evaluate('retrieves ES documentation', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'documentation: elasticsearch https',
        description: 'Validates retrieve_elastic_doc usage for configuring HTTPS in Elasticsearch.',
        examples: [
          {
            input: { question: 'How can I configure HTTPS in Elasticsearch?' },
            output: {
              criteria: [
                `Uses the ${RETRIEVE_ELASTIC_DOC_FUNCTION_NAME} function before answering the question about the Elastic stack`,
                'The assistant provides guidance on configuring HTTPS for Elasticsearch based on the retrieved documentation',
                `Any additional information beyond the retrieved documentation must be factually accurate and relevant to the user's question`,
                'Mentions Elasticsearch and HTTPS configuration steps consistent with the documentation',
              ],
            },
            metadata: {},
          },
        ],
      },
    });
  });

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

  evaluate('retrieves Observability documentation', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'documentation: observability nodejs apm',
        description: 'Validates retrieve_elastic_doc usage for Observability APM instructions.',
        examples: [
          {
            input: {
              question:
                'How can I set up APM instrumentation for my Node.js service in Elastic Observability?',
            },
            output: {
              criteria: [
                `Uses the ${RETRIEVE_ELASTIC_DOC_FUNCTION_NAME} function before answering the question about Observability`,
                'Provides instructions based on the Observability docs for setting up APM instrumentation',
                'Mentions steps like installing the APM agent, configuring it with the service name and APM Server URL, etc.',
                `Any additional information beyond the retrieved documentation must be factually accurate and relevant to the user's question`,
              ],
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate.afterAll(async ({ documentationClient, log }) => {
    await documentationClient.uninstall();
  });
});
