/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAvailableConnectors } from '@kbn/gen-ai-functional-testing';
import type { FtrProviderContext } from '../ftr_provider_context';
import { converseApiSuite } from './converse';

/**
 * Environment variable for EIS CCM API key (set by CI from Vault)
 * Vault path: secret/kibana-issues/dev/inference/kibana-eis-ccm
 */
const EIS_CCM_API_KEY_ENV = 'KIBANA_EIS_CCM_API_KEY';

const getEisCcmApiKey = (): string => {
  const envValue = process.env[EIS_CCM_API_KEY_ENV];
  if (envValue) {
    return envValue;
  }

  if (process.env.CI) {
    throw new Error(
      `EIS CCM API key not found. Set ${EIS_CCM_API_KEY_ENV} environment variable. ` +
        `Vault path: secret/kibana-issues/dev/inference/kibana-eis-ccm`
    );
  }

  // For local development:
  throw new Error(
    `EIS CCM API key not found. For local development:\n` +
      `  1. Run: vault read -field key secret/kibana-issues/dev/inference/kibana-eis-ccm\n` +
      `  2. Export: export ${EIS_CCM_API_KEY_ENV}="<your-key>"\n` +
      `  3. Run tests again`
  );
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
}

const getEisChatCompletionModels = (endpoints: EisInferenceEndpoint[]): EisChatModel[] => {
  return endpoints
    .filter((ep) => ep.task_type === 'chat_completion' && ep.service === 'elastic')
    .map((ep) => ({
      inferenceId: ep.inference_id,
      modelId: ep.service_settings?.model_id || 'unknown',
    }));
};

// eslint-disable-next-line import/no-default-export
export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const es = getService('es');
  const log = getService('log');

  describe('Agent Builder - LLM Smoke tests', async () => {
    // Legacy hardcoded list of connectors from Vault
    describe('Agent Builder - Preconfigured Connector Smoke Tests', function () {
      const connectors = getAvailableConnectors();

      connectors.forEach((connector) => {
        describe(`Connector "${connector.id}"`, () => {
          converseApiSuite(connector, providerContext);
        });
      });
    });

    // EIS Dynamic Tests (discovers and tests all EIS models via Cloud Connected Mode)
    describe('Agent Builder - EIS Dynamic Smoke Tests', function () {
      this.timeout(120000);

      let eisChatModels: EisChatModel[] = [];

      before(async () => {
        // Step 1: Enable CCM by setting the API key in Elasticsearch
        log.info('Setting up Cloud Connected Mode (CCM) for EIS...');
        try {
          await es.transport.request({
            method: 'PUT',
            path: '/_inference/_ccm',
            body: {
              api_key: getEisCcmApiKey(),
            },
          });
          log.info('✅ CCM API key successfully set in Elasticsearch');
        } catch (error) {
          log.error(`❌ Failed to set CCM API key: ${error}`);
          throw error;
        }

        // Step 2: Discover all EIS chat completion models
        log.info('Discovering EIS inference endpoints...');
        try {
          const response = await es.inference.get({
            inference_id: '_all',
          });

          const endpoints = response.endpoints as EisInferenceEndpoint[];
          eisChatModels = getEisChatCompletionModels(endpoints);

          log.info(`EIS Chat Completion Models Discovered:`);
          eisChatModels.forEach((model, index) => {
            log.info(`${index + 1}. ${model.modelId} (${model.inferenceId})`);
          });
          log.info(`Total: ${eisChatModels.length} models`);
        } catch (error) {
          log.error(`❌ Failed to discover inference endpoints: ${error}`);
          throw error;
        }
      });

      it('should have discovered at least one EIS chat completion model', async () => {
        if (eisChatModels.length === 0) {
          throw new Error(
            'No EIS chat completion models discovered. ' +
              'Make sure CCM is properly configured and ES is connected to EIS QA.'
          );
        }
        log.info(`✅ Discovered ${eisChatModels.length} EIS chat completion model(s)`);
      });
    });
  });
}
