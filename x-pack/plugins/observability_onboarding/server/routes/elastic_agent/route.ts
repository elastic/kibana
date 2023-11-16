/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { v4 as uuidv4 } from 'uuid';
import {
  generateSystemLogsYml,
  generateCustomLogsYml,
} from '../../../common/elastic_agent_logs';
import { getAuthenticationAPIKey } from '../../lib/get_authentication_api_key';
import { getFallbackESUrl } from '../../lib/get_fallback_urls';
import { getObservabilityOnboardingFlow } from '../../lib/state';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';

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

    const yaml =
      savedState?.type === 'systemLogs'
        ? generateSystemLogsYml({
            ...savedState?.state,
            apiKey: authApiKey
              ? `${authApiKey?.apiKeyId}:${authApiKey?.apiKey}`
              : '$API_KEY',
            esHost: elasticsearchUrl,
            uuid: uuidv4(),
          })
        : generateCustomLogsYml({
            ...savedState?.state,
            apiKey: authApiKey
              ? `${authApiKey?.apiKeyId}:${authApiKey?.apiKey}`
              : '$API_KEY',
            esHost: elasticsearchUrl,
            logfileId: `custom-logs-${uuidv4()}`,
          });

    return yaml;
  },
});

export const elasticAgentRouteRepository = {
  ...generateConfig,
};
