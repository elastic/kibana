/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import type { Client } from '@elastic/elasticsearch';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';
import { getESHosts } from './get_es_hosts';
import { getKibanaUrl } from './get_kibana_url';
import { createShipperApiKey } from './create_shipper_api_key';
import { saveObservabilityOnboardingState } from './save_observability_onboarding_state';

const createApiKeyRoute = createObservabilityOnboardingServerRoute({
  endpoint:
    'POST /internal/observability_onboarding/custom_logs/install_shipper_setup',
  options: { tags: [] },
  params: t.type({
    body: t.type({
      name: t.string,
      state: t.record(t.string, t.unknown),
    }),
  }),
  async handler(resources): Promise<{
    apiKeyId: string;
    apiKeyEncoded: string;
    statusApiEndpoint: string;
    scriptDownloadUrl: string;
    esHost: string;
  }> {
    const {
      context,
      params: {
        body: { name, state },
      },
      core,
      plugins,
      request,
    } = resources;
    const coreStart = await core.start();
    const scriptDownloadUrl = getKibanaUrl(
      coreStart,
      '/observabilityOnboarding/standalone-agent-setup.sh'
    );
    const statusApiEndpoint = getKibanaUrl(
      coreStart,
      '/api/observability_onboarding/custom_logs/status'
    );
    const {
      elasticsearch: { client },
    } = await context.core;
    const { id: apiKeyId, encoded: apiKeyEncoded } = await createShipperApiKey(
      client.asCurrentUser,
      name
    );
    const [esHost] = getESHosts({
      cloudSetup: plugins.cloud.setup,
      esClient: coreStart.elasticsearch.client.asInternalUser as Client,
    });

    const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
    saveObservabilityOnboardingState({
      savedObjectsClient,
      observabilityOnboardingState: { apiKeyId, state },
    });
    return {
      apiKeyId, // key the status off this
      apiKeyEncoded,
      statusApiEndpoint,
      scriptDownloadUrl,
      esHost,
    };
  },
});

const updateStatusRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /api/observability_onboarding/custom_logs/status',
  options: { tags: [] },
  params: t.type({
    query: t.type({
      ping: t.string,
    }),
  }),
  async handler(resources): Promise<{ ok: string; ping: string }> {
    const {
      params: {
        query: { ping },
      },
    } = resources;
    return { ok: 'success', ping };
  },
});

export const customLogsRouteRepository = {
  ...createApiKeyRoute,
  ...updateStatusRoute,
};
