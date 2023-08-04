/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { getAuthenticationAPIKey } from '../../lib/get_authentication_api_key';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';
import { generateYml } from './generate_yml';
import { getFallbackESUrl } from '../../lib/get_fallback_urls';
import { getObservabilityOnboardingFlow } from '../../lib/state';

const generateConfig = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /internal/observability_onboarding/elastic_agent/config',
  params: t.type({
    query: t.type({ onboardingId: t.string }),
  }),
  options: { tags: [] },
  async handler(resources): Promise<string> {
    const {
      params: {
        query: { onboardingId },
      },
      core,
      plugins,
      request,
      services: { esLegacyConfigService },
    } = resources;
    const authApiKey = getAuthenticationAPIKey(request);

    const coreStart = await core.start();
    const savedObjectsClient =
      coreStart.savedObjects.createInternalRepository();

    const elasticsearchUrl = plugins.cloud?.setup?.elasticsearchUrl
      ? [plugins.cloud?.setup?.elasticsearchUrl]
      : await getFallbackESUrl(esLegacyConfigService);

    const savedState = await getObservabilityOnboardingFlow({
      savedObjectsClient,
      savedObjectId: onboardingId,
    });

    const yaml = generateYml({
      datasetName: savedState?.state?.datasetName,
      customConfigurations: savedState?.state?.customConfigurations,
      logFilePaths: savedState?.state?.logFilePaths,
      namespace: savedState?.state?.namespace,
      apiKey: authApiKey
        ? `${authApiKey?.apiKeyId}:${authApiKey?.apiKey}`
        : '$API_KEY',
      esHost: elasticsearchUrl,
      logfileId: `custom-logs-${Date.now()}`,
      serviceName: savedState?.state?.serviceName,
    });

    return yaml;
  },
});

export const elasticAgentRouteRepository = {
  ...generateConfig,
};
