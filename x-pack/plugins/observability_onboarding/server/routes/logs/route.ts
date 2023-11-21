/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';
import { getFallbackKibanaUrl } from '../../lib/get_fallback_urls';
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

    const hasPrivileges = await hasLogMonitoringPrivileges(
      client.asCurrentUser
    );

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
  }> {
    const { core, plugins, kibanaVersion } = resources;
    const coreStart = await core.start();

    const fleetPluginStart = await plugins.fleet.start();
    const agentClient = fleetPluginStart.agentService.asInternalUser;

    // If undefined, we will follow fleet's strategy to select latest available version:
    // for serverless we will use the latest published version, for statefull we will use
    // current Kibana version. If false, irrespective of fleet flags and logic, we are
    // explicitly deciding to not append the current version.
    const includeCurrentVersion = kibanaVersion.endsWith('-SNAPSHOT')
      ? false
      : undefined;

    const elasticAgentVersion =
      await agentClient.getLatestAgentAvailableVersion(includeCurrentVersion);

    const kibanaUrl =
      core.setup.http.basePath.publicBaseUrl ?? // priority given to server.publicBaseUrl
      plugins.cloud?.setup?.kibanaUrl ?? // then cloud id
      getFallbackKibanaUrl(coreStart); // falls back to local network binding
    const scriptDownloadUrl = `${kibanaUrl}/plugins/observabilityOnboarding/assets/standalone_agent_setup.sh`;
    const apiEndpoint = `${kibanaUrl}/internal/observability_onboarding`;

    return {
      apiEndpoint,
      scriptDownloadUrl,
      elasticAgentVersion,
    };
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
  async handler(
    resources
  ): Promise<{ apiKeyEncoded: string; onboardingId: string }> {
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
    const { encoded: apiKeyEncoded } = await createShipperApiKey(
      client.asCurrentUser,
      name
    );

    const generatedState =
      type === 'systemLogs' ? { namespace: 'default' } : state;
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
};
