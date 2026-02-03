/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAvailableConnectors } from '@kbn/gen-ai-functional-testing';
import type { FtrProviderContext } from '../ftr_provider_context';
import { runConverseTests } from './converse';

/**
 * Environment variable for EIS CCM API key (set by CI from Vault)
 * Vault path: secret/kibana-issues/dev/inference/kibana-eis-ccm
 */
const EIS_CCM_API_KEY_ENV = 'KIBANA_EIS_CCM_API_KEY';
const eisCcmApiKey = process.env[EIS_CCM_API_KEY_ENV];

const getEisChatCompletionModels = (endpoints: EisInferenceEndpoint[]): EisChatModel[] => {
  return endpoints
    .filter((ep) => ep.task_type === 'chat_completion' && ep.service === 'elastic')
    .map((ep) => ({
      inferenceId: ep.inference_id,
      modelId: ep.service_settings?.model_id || 'unknown',
    }));
};

interface EisInferenceEndpoint {
  inference_id: string;
  task_type: string;
  service: string;
  service_settings?: {
    model_id?: string;
    [key: string]: unknown;
  };
}

interface EisChatModel {
  inferenceId: string;
  modelId: string;
  connectorId?: string;
}

// eslint-disable-next-line import/no-default-export
export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const es = getService('es');
  const log = getService('log');
  const supertest = getService('supertest');

  describe('Agent Builder - LLM Smoke tests', function () {
    // Preconfigured connectors from Vault
    describe('Preconfigured Connector Smoke Tests', function () {
      this.timeout(300000);
      const connectors = getAvailableConnectors();

      it('should pass converse tests for all preconfigured connectors', async () => {
        for (const connector of connectors) {
          log.info(`Testing connector "${connector.id}"...`);
          await runConverseTests(connector.id, supertest);
          log.info(`✅ ${connector.id}: All tests passed`);
        }
      });
    });

    // EIS Dynamic Tests (discovers and tests all EIS models via Cloud Connected Mode)
    describe('EIS Dynamic Smoke Tests', function () {
      this.timeout(600000); // 10 min for all EIS model tests

      const eisChatModels: EisChatModel[] = [];
      const createdConnectorIds: string[] = [];

      before(async () => {
        if (!eisCcmApiKey) {
          log.warning(
            `Skipping EIS tests: ${EIS_CCM_API_KEY_ENV} not set. ` +
              `For local dev: export ${EIS_CCM_API_KEY_ENV}="$(vault read -field key secret/kibana-issues/dev/inference/kibana-eis-ccm)"`
          );
          return;
        }

        // Step 1: Enable CCM
        const keyPreview = eisCcmApiKey.substring(0, 8);
        log.info(
          `Setting up Cloud Connected Mode (CCM) for EIS... (key starts with: ${keyPreview}...)`
        );
        await es.transport.request({
          method: 'PUT',
          path: '/_inference/_ccm',
          body: { api_key: eisCcmApiKey },
        });
        log.info('✅ CCM API key set');

        // Step 2: Discover EIS models (with retry - endpoints may take time to appear)
        log.info('Discovering EIS inference endpoints...');
        let discovered: EisChatModel[] = [];
        const maxRetries = 5;
        const retryDelayMs = 3000;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          const response = await es.inference.get({ inference_id: '_all' });
          const endpoints = response.endpoints as EisInferenceEndpoint[];
          discovered = getEisChatCompletionModels(endpoints);

          if (discovered.length > 0) {
            log.info(`Found ${discovered.length} EIS models on attempt ${attempt}`);
            break;
          }

          if (attempt < maxRetries) {
            log.info(
              `No EIS models found (attempt ${attempt}/${maxRetries}), waiting ${retryDelayMs}ms...`
            );
            await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
          }
        }

        log.info(`Found ${discovered.length} EIS chat completion models`);

        // Step 3: Create connectors for each model
        for (const model of discovered) {
          const connectorName = `eis-${model.modelId}`;
          log.info(`Creating connector for ${model.modelId}...`);

          try {
            const { body } = await supertest
              .post('/api/actions/connector')
              .set('kbn-xsrf', 'true')
              .send({
                name: connectorName,
                connector_type_id: '.inference',
                config: {
                  provider: 'elastic',
                  taskType: 'chat_completion',
                  inferenceId: model.inferenceId,
                },
                secrets: {},
              })
              .expect(200);

            createdConnectorIds.push(body.id);
            eisChatModels.push({ ...model, connectorId: body.id });
            log.info(`✅ Created connector ${body.id} for ${model.modelId}`);
          } catch (error) {
            log.error(`❌ Failed to create connector for ${model.modelId}: ${error}`);
          }
        }

        log.info(`Successfully created ${eisChatModels.length} EIS connectors`);
      });

      after(async () => {
        // Cleanup: delete created connectors
        for (const connectorId of createdConnectorIds) {
          try {
            await supertest
              .delete(`/api/actions/connector/${connectorId}`)
              .set('kbn-xsrf', 'true')
              .expect(204);
            log.debug(`Deleted connector ${connectorId}`);
          } catch (e) {
            log.warning(`Failed to delete connector ${connectorId}`);
          }
        }
      });

      it('should have discovered and created connectors for EIS models', async function () {
        if (!eisCcmApiKey) {
          this.skip();
        }
        if (eisChatModels.length === 0) {
          // Fetch current endpoints for debugging
          const response = await es.inference.get({ inference_id: '_all' });
          const endpoints = response.endpoints as EisInferenceEndpoint[];
          const chatCompletionEndpoints = endpoints.filter(
            (ep) => ep.task_type === 'chat_completion'
          );
          const elasticEndpoints = endpoints.filter((ep) => ep.service === 'elastic');

          const keyPreview = eisCcmApiKey ? eisCcmApiKey.substring(0, 8) : 'NOT_SET';
          throw new Error(
            `No EIS connectors created.\n` +
              `CCM API key starts with: ${keyPreview}...\n` +
              `Total endpoints: ${endpoints.length}\n` +
              `Chat completion endpoints: ${chatCompletionEndpoints.length}\n` +
              `Elastic service endpoints: ${elasticEndpoints.length}\n` +
              `Endpoint services: ${[...new Set(endpoints.map((ep) => ep.service))].join(', ')}\n` +
              `Check CCM setup and EIS QA connectivity.`
          );
        }
        log.info(`✅ ${eisChatModels.length} EIS connectors ready for testing`);
      });

      // Run smoke tests for each EIS model
      it('should successfully converse with each EIS model', async function () {
        if (!eisCcmApiKey) {
          this.skip();
        }
        if (eisChatModels.length === 0) {
          this.skip();
        }

        for (const model of eisChatModels) {
          log.info(`Testing ${model.modelId}...`);
          await runConverseTests(model.connectorId!, supertest);
          log.info(`✅ ${model.modelId}: All tests passed`);
        }
      });
    });
  });
}
