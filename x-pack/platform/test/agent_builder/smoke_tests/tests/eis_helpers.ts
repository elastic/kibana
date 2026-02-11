/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

const EIS_MODELS_PATH = resolve(REPO_ROOT, 'target/eis_models.json');

export interface DiscoveredModel {
  inferenceId: string;
  modelId: string;
}

export const getPreDiscoveredEisModels = (): DiscoveredModel[] => {
  if (!existsSync(EIS_MODELS_PATH)) {
    return [];
  }
  try {
    const data = JSON.parse(readFileSync(EIS_MODELS_PATH, 'utf8'));
    return data.models || [];
  } catch {
    return [];
  }
};

/**
 * Builds preconfigured connectors for EIS models.
 * These connectors reference EIS inference endpoints that will exist once CCM is enabled.
 */
export const buildEisPreconfiguredConnectors = (): Record<string, unknown> => {
  const models = getPreDiscoveredEisModels();
  const connectors: Record<string, unknown> = {};

  for (const model of models) {
    const connectorId = `eis-${model.modelId}`;
    connectors[connectorId] = {
      name: `EIS ${model.modelId}`,
      actionTypeId: '.inference',
      exposeConfig: true,
      config: {
        provider: 'elastic',
        taskType: 'chat_completion',
        inferenceId: model.inferenceId,
      },
      secrets: {},
    };
  }

  return connectors;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Enables Cloud Connected Mode (CCM) for EIS and waits for endpoints to be available.
 * Once CCM is enabled, EIS auto-provisions inference endpoints that preconfigured connectors reference.
 */
export const enableCcm = async (es: Client, apiKey: string, log: ToolingLog): Promise<void> => {
  log.info('[EIS] Enabling Cloud Connected Mode...');
  await es.transport.request({
    method: 'PUT',
    path: '/_inference/_ccm',
    body: { api_key: apiKey },
  });
  log.info('[EIS] ✅ CCM enabled');

  // Wait for EIS to provision endpoints
  log.info('[EIS] Waiting for EIS endpoints to be provisioned...');
  const maxRetries = 5;
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

  log.warning('[EIS] ⚠️ No EIS endpoints found after waiting');
};
