/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';

/**
 * Environment variable for EIS CCM API key (set by CI from Vault)
 * Vault path: secret/kibana-issues/dev/inference/kibana-eis-ccm
 *
 * For local dev: export KIBANA_EIS_CCM_API_KEY="$(vault read -field key secret/kibana-issues/dev/inference/kibana-eis-ccm)"
 */
export const EIS_CCM_API_KEY_ENV = 'KIBANA_EIS_CCM_API_KEY';

interface EisInferenceEndpoint {
  inference_id: string;
  task_type: string;
  service: string;
  service_settings?: {
    model_id?: string;
    [key: string]: unknown;
  };
}

export interface EisModel {
  inferenceId: string;
  modelId: string;
  connectorId: string;
}

/**
 * Enables Cloud Connected Mode (CCM) for EIS
 */
export const enableCcm = async (es: Client, apiKey: string, log: ToolingLog): Promise<void> => {
  log.info('[EIS] Enabling Cloud Connected Mode...');
  await es.transport.request({
    method: 'PUT',
    path: '/_inference/_ccm',
    body: { api_key: apiKey },
  });
  log.info('[EIS] ✅ CCM enabled');
};

/**
 * Discovers EIS chat completion models with retry logic
 * (endpoints may take time to appear after CCM is enabled)
 */
export const discoverEisModels = async (
  es: Client,
  log: ToolingLog,
  { maxRetries = 5, retryDelayMs = 3000 } = {}
): Promise<Array<{ inferenceId: string; modelId: string }>> => {
  log.info('[EIS] Discovering inference endpoints...');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await es.inference.get({ inference_id: '_all' });
    const endpoints = response.endpoints as EisInferenceEndpoint[];

    const discovered = endpoints
      .filter((ep) => ep.task_type === 'chat_completion' && ep.service === 'elastic')
      .map((ep) => ({
        inferenceId: ep.inference_id,
        modelId: ep.service_settings?.model_id || 'unknown',
      }));

    if (discovered.length > 0) {
      log.info(`[EIS] Found ${discovered.length} models on attempt ${attempt}`);
      return discovered;
    }

    if (attempt < maxRetries) {
      log.info(`[EIS] No models found (attempt ${attempt}/${maxRetries}), waiting...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  log.warning('[EIS] No EIS models discovered');
  return [];
};

/**
 * Creates inference connectors for discovered EIS models
 */
export const createEisConnectors = async (
  models: Array<{ inferenceId: string; modelId: string }>,
  supertest: SuperTest.Agent,
  log: ToolingLog
): Promise<{ connectors: EisModel[]; connectorIds: string[] }> => {
  log.info(`[EIS] Creating connectors for ${models.length} models...`);

  const connectors: EisModel[] = [];
  const connectorIds: string[] = [];

  for (const model of models) {
    try {
      const { body } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'true')
        .send({
          name: `eis-${model.modelId}`,
          connector_type_id: '.inference',
          config: {
            provider: 'elastic',
            taskType: 'chat_completion',
            inferenceId: model.inferenceId,
          },
          secrets: {},
        })
        .expect(200);

      connectorIds.push(body.id);
      connectors.push({
        inferenceId: model.inferenceId,
        modelId: model.modelId,
        connectorId: body.id,
      });
    } catch (error) {
      log.error(`[EIS] Failed to create connector for ${model.modelId}: ${error}`);
    }
  }

  log.info(`[EIS] ✅ Created ${connectors.length} connectors`);
  return { connectors, connectorIds };
};

/**
 * Deletes connectors created during test setup
 */
export const cleanupEisConnectors = async (
  connectorIds: string[],
  supertest: SuperTest.Agent,
  log: ToolingLog
): Promise<void> => {
  if (connectorIds.length === 0) return;

  log.info(`[EIS] Cleaning up ${connectorIds.length} connectors...`);
  for (const id of connectorIds) {
    try {
      await supertest.delete(`/api/actions/connector/${id}`).set('kbn-xsrf', 'true');
    } catch {
      // ignore cleanup errors
    }
  }
  log.info('[EIS] ✅ Cleanup complete');
};
