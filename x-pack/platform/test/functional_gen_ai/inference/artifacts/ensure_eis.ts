/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { Client } from '@elastic/elasticsearch';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const EIS_URL_SETTING = 'xpack.inference.elastic.url';
const EMBEDDING_TASK_TYPES = new Set(['text_embedding', 'sparse_embedding', 'embedding']);

interface InferenceEndpoint {
  inference_id?: string;
  service?: string;
  task_type?: string;
}

const errorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

/**
 * EIS is configured with a node setting. Without it, storing a CCM key does not
 * grant the cluster access to hosted models.
 */
const assertEisUrlConfigured = async (es: Client, log: ToolingLog): Promise<void> => {
  const response = (await es.transport.request({
    method: 'GET',
    path: '/_nodes/settings?filter_path=nodes.*.settings.xpack.inference.elastic.url',
  })) as {
    nodes?: Record<
      string,
      { settings?: { xpack?: { inference?: { elastic?: { url?: string } } } } }
    >;
  };
  const urls = Object.values(response.nodes ?? {})
    .map((node) => node.settings?.xpack?.inference?.elastic?.url)
    .filter((url): url is string => typeof url === 'string' && url.length > 0);

  if (urls.length === 0) {
    throw new Error(
      `[EIS] ${EIS_URL_SETTING} is not set. Start Elasticsearch with -E ${EIS_URL_SETTING}=... before enabling Cloud Connected Mode.`
    );
  }

  log.info(`[EIS] Elasticsearch is configured for ${urls[0]}`);
};

const enableCcm = async (es: Client, apiKey: string): Promise<void> => {
  await es.transport.request({
    method: 'PUT',
    path: '/_inference/_ccm',
    body: { api_key: apiKey },
  });
};

const isCcmEnabled = async (es: Client): Promise<boolean> => {
  const response = (await es.transport.request({
    method: 'GET',
    path: '/_inference/_ccm',
  })) as { enabled?: boolean };
  return response.enabled === true;
};

const listEndpoints = async (es: Client): Promise<InferenceEndpoint[]> => {
  const response = await es.inference.get({ inference_id: '_all' });
  return (response.endpoints ?? []) as InferenceEndpoint[];
};

/** Chat and rerank endpoints are authorized once they exist; embedding installs call the model. */
const needsInferenceProbe = (endpoint: InferenceEndpoint): boolean => {
  const taskType = endpoint.task_type;
  if (taskType && EMBEDDING_TASK_TYPES.has(taskType)) {
    return true;
  }
  if (taskType === 'chat_completion' || taskType === 'completion' || taskType === 'rerank') {
    return false;
  }
  return !endpoint.inference_id?.includes('chat_completion');
};

/**
 * A listed endpoint is not proof of access. Authorization finishes after CCM is
 * stored, and product-doc install fails if the first embedding call is rejected.
 */
const probeInferenceAccess = async (es: Client, inferenceId: string): Promise<void> => {
  await es.transport.request({
    method: 'POST',
    path: `/_inference/${encodeURIComponent(inferenceId)}`,
    body: {
      input: 'ping',
      timeout: '30s',
    },
  });
};

/**
 * Enables Cloud Connected Mode (CCM) so EIS-hosted inference endpoints (e.g. Jina)
 * become available on the local ES cluster. Confirms EIS is configured, CCM is
 * enabled, and embedding endpoints accept a request before returning.
 */
export const ensureEisEndpoints = async ({
  es,
  log,
  requiredInferenceIds,
}: {
  es: Client;
  log: ToolingLog;
  requiredInferenceIds: string[];
}): Promise<void> => {
  // Environment variable for EIS CCM API key (set by CI from Vault)
  const EIS_CCM_API_KEY_ENV = 'KIBANA_EIS_CCM_API_KEY';
  const eisCcmApiKey = process.env[EIS_CCM_API_KEY_ENV];
  const uniqueRequiredInferenceIds = [...new Set(requiredInferenceIds)];

  if (!eisCcmApiKey) {
    throw new Error(
      `[EIS] ${EIS_CCM_API_KEY_ENV} is not set; cannot enable CCM (required for: ${uniqueRequiredInferenceIds.join(
        ', '
      )})`
    );
  }

  await assertEisUrlConfigured(es, log);

  log.info('[EIS] Enabling Cloud Connected Mode...');
  await enableCcm(es, eisCcmApiKey);
  log.info('[EIS] CCM API key stored');

  // Authorization is async: the endpoint id can show up before the cluster can call it.
  // Jina provisioning in CI often exceeds a few seconds.
  log.info('[EIS] Waiting for EIS to be enabled and for inference access...');
  const maxRetries = 20;
  const retryDelayMs = 5000;
  let lastError = 'EIS is not ready';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const enabled = await isCcmEnabled(es);
      if (!enabled) {
        lastError = 'Cloud Connected Mode is not enabled';
        log.info(`[EIS] ${lastError} (attempt ${attempt}/${maxRetries}), re-enabling...`);
        await enableCcm(es, eisCcmApiKey);
        await sleep(retryDelayMs);
        continue;
      }

      const endpoints = await listEndpoints(es);
      const endpointsById = new Map(
        endpoints
          .filter((endpoint): endpoint is InferenceEndpoint & { inference_id: string } =>
            Boolean(endpoint.inference_id)
          )
          .map((endpoint) => [endpoint.inference_id, endpoint])
      );
      const missingInferenceIds = uniqueRequiredInferenceIds.filter((id) => !endpointsById.has(id));
      if (missingInferenceIds.length > 0) {
        lastError = `missing inference endpoints: ${missingInferenceIds.join(', ')}`;
        log.info(`[EIS] ${lastError} (attempt ${attempt}/${maxRetries}), waiting...`);
        await sleep(retryDelayMs);
        continue;
      }

      for (const inferenceId of uniqueRequiredInferenceIds) {
        const endpoint = endpointsById.get(inferenceId);
        if (!endpoint) {
          throw new Error(`inference endpoint [${inferenceId}] is no longer listed`);
        }
        if (endpoint.service !== 'elastic') {
          throw new Error(
            `inference endpoint [${inferenceId}] service is [${
              endpoint.service ?? 'unknown'
            }], expected elastic`
          );
        }
        if (needsInferenceProbe(endpoint)) {
          await probeInferenceAccess(es, inferenceId);
        }
      }

      log.info(
        `[EIS] ✅ CCM enabled and inference access confirmed for: ${uniqueRequiredInferenceIds.join(
          ', '
        )} (attempt ${attempt})`
      );
      return;
    } catch (error) {
      lastError = errorMessage(error);
      log.info(`[EIS] Waiting for EIS access: ${lastError} (attempt ${attempt}/${maxRetries})`);
      if (attempt < maxRetries) {
        await sleep(retryDelayMs);
      }
    }
  }

  throw new Error(
    `[EIS] Elasticsearch does not have access to EIS after ${maxRetries} attempts (need ${uniqueRequiredInferenceIds.join(
      ', '
    )}). Last error: ${lastError}`
  );
};
