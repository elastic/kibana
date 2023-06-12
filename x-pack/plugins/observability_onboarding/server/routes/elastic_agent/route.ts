/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAuthenticationAPIKey } from '../../lib/get_authentication_api_key';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';
import { getObservabilityOnboardingState } from '../custom_logs/get_observability_onboarding_state';
import { generateYml } from './generate_yml';
import { getFallbackUrls } from '../custom_logs/get_fallback_urls';

const generateConfig = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /api/observability_onboarding/elastic_agent/config 2023-05-24',
  options: { tags: [] },
  async handler(resources): Promise<string> {
    const { core, plugins, request } = resources;
    const authApiKey = getAuthenticationAPIKey(request);

    const coreStart = await core.start();
    const savedObjectsClient =
      coreStart.savedObjects.createInternalRepository();

    const elasticsearchUrl =
      plugins.cloud?.setup?.elasticsearchUrl ??
      getFallbackUrls(coreStart).elasticsearchUrl;

    const savedState = await getObservabilityOnboardingState({
      savedObjectsClient,
      apiKeyId: authApiKey?.apiKeyId ?? '',
    });

    const yaml = generateYml({
      datasetName: savedState?.state.datasetName,
      customConfigurations: savedState?.state.customConfigurations,
      logFilePaths: savedState?.state.logFilePaths,
      namespace: savedState?.state.namespace,
      apiKey: authApiKey
        ? `${authApiKey?.apiKeyId}:${authApiKey?.apiKey}`
        : '$API_KEY',
      esHost: [elasticsearchUrl],
      logfileId: `custom-logs-${Date.now()}`,
    });

    return yaml;
  },
});

export const elasticAgentRouteRepository = {
  ...generateConfig,
};
