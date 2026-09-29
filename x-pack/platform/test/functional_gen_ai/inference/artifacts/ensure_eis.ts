/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { Client } from '@elastic/elasticsearch';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Enables Cloud Connected Mode (CCM) so EIS-hosted inference endpoints (e.g. Jina)
 * become available on the local ES cluster, then waits for the required endpoints
 * to be provisioned. Fails fast if the CCM API key is missing or endpoints never appear.
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

  if (!eisCcmApiKey) {
    throw new Error(
      `[EIS] ${EIS_CCM_API_KEY_ENV} is not set; cannot enable CCM (required for: ${[
        ...new Set(requiredInferenceIds),
      ].join(', ')})`
    );
  }

  log.info('[EIS] Enabling Cloud Connected Mode...');
  await es.transport.request({
    method: 'PUT',
    path: '/_inference/_ccm',
    body: { api_key: eisCcmApiKey },
  });
  log.info('[EIS] ✅ CCM enabled');

  // Wait for EIS to provision endpoints. Jina provisioning in CI often exceeds a few
  // seconds, so budget ~60s before failing the artifact build.
  log.info('[EIS] Waiting for EIS endpoints to be provisioned...');
  const maxRetries = 20;
  const retryDelayMs = 3000;
  const uniqueRequiredInferenceIds = [...new Set(requiredInferenceIds)];

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await es.inference.get({ inference_id: '_all' });
    const endpoints = response.endpoints as Array<{ inference_id?: string }>;
    const presentInferenceIds = new Set(
      endpoints
        .map((ep) => ep.inference_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    );
    const missingInferenceIds = uniqueRequiredInferenceIds.filter(
      (id) => !presentInferenceIds.has(id)
    );

    if (missingInferenceIds.length === 0) {
      log.info(
        `[EIS] ✅ Found inference endpoints for: ${uniqueRequiredInferenceIds.join(
          ', '
        )} (attempt ${attempt})`
      );
      return;
    }
    if (attempt < maxRetries) {
      log.info(
        `[EIS] Missing inference endpoints: ${missingInferenceIds.join(
          ', '
        )} (attempt ${attempt}/${maxRetries}), waiting...`
      );

      await sleep(retryDelayMs);
    }
  }

  throw new Error(
    `[EIS] Required inference endpoints not all present after ${maxRetries} attempts (need ${uniqueRequiredInferenceIds.join(
      ', '
    )}). Failing fast before artifact generation.`
  );
};
