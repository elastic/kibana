/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';
import { getFallbackESUrl } from '../../lib/get_fallback_urls';
import { getKibanaUrl } from '../../lib/get_fallback_urls';
import { getAgentVersion } from '../../lib/get_agent_version';
import { hasLogMonitoringPrivileges } from './api_key/has_log_monitoring_privileges';
import { saveObservabilityOnboardingFlow } from '../../lib/state';
import { createShipperApiKey } from './api_key/create_shipper_api_key';
import { ObservabilityOnboardingFlow } from '../../saved_objects/observability_onboarding_status';

const logMonitoringPrivilegesRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /internal/observability_onboarding/logs/setup/privileges',
  options: { tags: [] },

  handler: async (resources): Promise<{ hasPrivileges: boolean }> => {
    const { context } = resources;

    const {
      elasticsearch: { client },
    } = await context.core;

    const hasPrivileges = await hasLogMonitoringPrivileges(client.asCurrentUser);

    return { hasPrivileges };
  },
});

const installShipperSetupRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /internal/observability_onboarding/logs/setup/environment',
  options: { tags: [] },
  async handler(resources): Promise<{
    apiEndpoint: string;
    scriptDownloadUrl: string;
    elasticAgentVersion: string;
    elasticsearchUrl: string[];
  }> {
    const {
      core,
      plugins,
      kibanaVersion,
      services: { esLegacyConfigService },
    } = resources;

    const fleetPluginStart = await plugins.fleet.start();
    const elasticAgentVersion = await getAgentVersion(fleetPluginStart, kibanaVersion);
    const kibanaUrl = getKibanaUrl(core.setup, plugins.cloud?.setup);
    const scriptDownloadUrl = new URL(
      core.setup.http.staticAssets.getPluginAssetHref('standalone_agent_setup.sh'),
      kibanaUrl
    ).toString();

    const apiEndpoint = new URL(`${kibanaUrl}/internal/observability_onboarding`).toString();

    const elasticsearchUrl = plugins.cloud?.setup?.elasticsearchUrl
      ? [plugins.cloud?.setup?.elasticsearchUrl]
      : await getFallbackESUrl(esLegacyConfigService);

    return {
      apiEndpoint,
      elasticsearchUrl,
      scriptDownloadUrl,
      elasticAgentVersion,
    };
  },
});

const createAPIKeyRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'POST /internal/observability_onboarding/otel/api_key',
  options: { tags: [] },
  params: t.type({}),
  async handler(resources): Promise<{ apiKeyEncoded: string }> {
    const { context } = resources;
    const {
      elasticsearch: { client },
    } = await context.core;
    const { encoded: apiKeyEncoded } = await createShipperApiKey(client.asCurrentUser, 'otel logs');

    return { apiKeyEncoded };
  },
});

const createFlowRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'POST /internal/observability_onboarding/logs/flow',
  options: { tags: [] },
  params: t.type({
    body: t.intersection([
      t.type({
        name: t.string,
      }),
      t.type({
        type: t.union([t.literal('logFiles'), t.literal('systemLogs')]),
      }),
      t.partial({
        state: t.record(t.string, t.unknown),
      }),
    ]),
  }),
  async handler(resources): Promise<{ apiKeyEncoded: string; onboardingId: string }> {
    const {
      context,
      params: {
        body: { name, type, state },
      },
      core,
      request,
    } = resources;
    const coreStart = await core.start();
    const {
      elasticsearch: { client },
    } = await context.core;
    const { encoded: apiKeyEncoded } = await createShipperApiKey(client.asCurrentUser, name);

    const generatedState = type === 'systemLogs' ? { namespace: 'default' } : state;
    const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);

    const { id } = await saveObservabilityOnboardingFlow({
      savedObjectsClient,
      observabilityOnboardingState: {
        type,
        state: generatedState as ObservabilityOnboardingFlow['state'],
        progress: {},
      },
    });

    return { apiKeyEncoded, onboardingId: id };
  },
});

export const logsOnboardingRouteRepository = {
  ...logMonitoringPrivilegesRoute,
  ...installShipperSetupRoute,
  ...createFlowRoute,
  ...createAPIKeyRoute,
};
