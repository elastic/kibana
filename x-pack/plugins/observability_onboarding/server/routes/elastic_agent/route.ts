/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { getAuthenticationAPIKey } from '../../lib/get_authentication_api_key';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';
import { findLatestObservabilityOnboardingState } from '../custom_logs/find_latest_observability_onboarding_state';
import { getESHosts } from '../custom_logs/get_es_hosts';
import { generateYml } from './generate_yml';

const generateConfig = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /api/observability_onboarding/elastic_agent/config',
  options: { tags: [] },
  async handler(resources): Promise<string> {
    const { core, plugins, request } = resources;
    const { apiKeyId, apiKey } = getAuthenticationAPIKey(request);

    const coreStart = await core.start();
    const savedObjectsClient =
      coreStart.savedObjects.createInternalRepository();

    const esHost = getESHosts({
      cloudSetup: plugins.cloud.setup,
      esClient: coreStart.elasticsearch.client.asInternalUser as Client,
    });

    const savedState = await findLatestObservabilityOnboardingState({
      savedObjectsClient,
    });

    const yaml = generateYml({
      datasetName: savedState?.state.datasetName,
      customConfigurations: savedState?.state.customConfigurations,
      logFilePaths: savedState?.state.logFilePaths,
      namespace: savedState?.state.namespace,
      apiKey: `${apiKeyId}:${apiKey}`,
      esHost,
      logfileId: `custom-logs-${Date.now()}`,
    });

    return yaml;
  },
});

export const elasticAgentRouteRepository = {
  ...generateConfig,
};
