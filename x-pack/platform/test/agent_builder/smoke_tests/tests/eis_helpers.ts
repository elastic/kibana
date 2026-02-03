/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';

export interface EisModel {
  inferenceId: string;
  modelId: string;
  connectorId: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Enables Cloud Connected Mode (CCM) for EIS and waits for endpoints to be available.
 * This makes EIS inference endpoints available in Elasticsearch.
 */
export const enableCcm = async (es: Client, apiKey: string, log: ToolingLog): Promise<void> => {
  log.info('[EIS] Enabling Cloud Connected Mode...');
  await es.transport.request({
    method: 'PUT',
    path: '/_inference/_ccm',
    body: { api_key: apiKey },
  });
  log.info('[EIS] ✅ CCM enabled');

  // Wait for EIS to provision endpoints (similar to discovery script)
  log.info('[EIS] Waiting for EIS endpoints to be provisioned...');
  const maxRetries = 10;
  const retryDelayMs = 3000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await es.inference.get({ inference_id: '_all' });
    const endpoints = response.endpoints as Array<{ task_type: string; service: string }>;
    const eisEndpoints = endpoints.filter(
      (ep) => ep.task_type === 'chat_completion' && ep.service === 'elastic'
    );

    if (eisEndpoints.length > 0) {
      log.info(`[EIS] ✅ Found ${eisEndpoints.length} EIS endpoints on attempt ${attempt}`);
      return;
    }

    if (attempt < maxRetries) {
      log.info(`[EIS] No endpoints yet (attempt ${attempt}/${maxRetries}), waiting...`);
      await sleep(retryDelayMs);
    }
  }

  log.warning('[EIS] ⚠️ No EIS endpoints found after waiting - connector creation may fail');
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

  log.info(`[EIS] ✅ Created ${connectors.length}/${models.length} connectors`);
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
