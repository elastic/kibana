/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { RETRIEVE_ELASTIC_DOC_FUNCTION_NAME } from '@kbn/observability-ai-assistant-plugin/server';
import type {
  InstallationStatusResponse,
  PerformInstallResponse,
  UninstallResponse,
} from '@kbn/product-doc-base-plugin/common/http_api/installation';
import { evaluate } from '../../src/evaluate';

/**
 * NOTE: This scenario has been migrated from the legacy evaluation framework.
 * - x-pack/solutions/observability/plugins/observability_ai_assistant_app/scripts/evaluation/scenarios/documentation/index.spec.ts
 * Any changes should be made in both places until the legacy evaluation framework is removed.
 */

const ELASTIC_DOCS_INSTALLATION_STATUS_API_PATH = '/internal/product_doc_base/status';
const ELASTIC_DOCS_INSTALL_ALL_API_PATH = '/internal/product_doc_base/install';
const ELASTIC_DOCS_UNINSTALL_ALL_API_PATH = '/internal/product_doc_base/uninstall';
const inferenceId = defaultInferenceEndpoints.ELSER;

evaluate.describe(
  'Retrieve documentation function',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate.beforeAll(async ({ kbnClient, log }) => {
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

    evaluate('retrieves ES documentation', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'documentation: elasticsearch https',
          description:
            'Validates retrieve_elastic_doc usage for configuring HTTPS in Elasticsearch.',
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

    evaluate.afterAll(async ({ kbnClient, log }) => {
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
  }
);
