/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { getAuthenticationAPIKey } from '../../lib/get_authentication_api_key';
import { ObservabilityOnboardingState } from '../../saved_objects/observability_onboarding_status';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';
import { createShipperApiKey } from './api_key/create_shipper_api_key';
import { hasLogMonitoringPrivileges } from './api_key/has_log_monitoring_privileges';
import { getFallbackUrls } from './get_fallback_urls';
import { getHasLogs } from './get_has_logs';
import { getObservabilityOnboardingState } from './get_observability_onboarding_state';
import { saveObservabilityOnboardingState } from './save_observability_onboarding_state';

const ELASTIC_AGENT_VERSION = '8.8.0'; // This should be defined from a source with the latest public release

const logMonitoringPrivilegesRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /internal/observability_onboarding/custom_logs/privileges',
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
  endpoint:
    'GET /internal/observability_onboarding/custom_logs/install_shipper_setup',
  options: { tags: [] },
  async handler(resources): Promise<{
    apiEndpoint: string;
    scriptDownloadUrl: string;
    elasticAgentVersion: string;
  }> {
    const { core, plugins } = resources;
    const coreStart = await core.start();

    const kibanaUrl =
      plugins.cloud?.setup?.kibanaUrl ?? getFallbackUrls(coreStart).kibanaUrl;
    const scriptDownloadUrl = `${kibanaUrl}/plugins/observabilityOnboarding/assets/standalone_agent_setup.sh`;
    const apiEndpoint = `${kibanaUrl}/api/observability_onboarding`;

    return {
      apiEndpoint,
      scriptDownloadUrl,
      elasticAgentVersion: ELASTIC_AGENT_VERSION,
    };
  },
});

const createApiKeyRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'POST /internal/observability_onboarding/custom_logs/save',
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
  }> {
    const {
      context,
      params: {
        body: { name, state },
      },
      core,
      request,
    } = resources;
    const coreStart = await core.start();
    const {
      elasticsearch: { client },
    } = await context.core;
    const { id: apiKeyId, encoded: apiKeyEncoded } = await createShipperApiKey(
      client.asCurrentUser,
      name
    );

    const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);

    await saveObservabilityOnboardingState({
      savedObjectsClient,
      apiKeyId,
      observabilityOnboardingState: { state } as ObservabilityOnboardingState,
    });

    return {
      apiKeyId,
      apiKeyEncoded,
    };
  },
});

const stepProgressUpdateRoute = createObservabilityOnboardingServerRoute({
  endpoint:
    'GET /api/observability_onboarding/custom_logs/step/{name} 2023-05-24',
  options: { tags: [] },
  params: t.type({
    path: t.type({
      name: t.string,
    }),
    query: t.type({
      status: t.string,
    }),
  }),
  async handler(resources): Promise<object> {
    const {
      params: {
        path: { name },
        query: { status },
      },
      request,
      core,
    } = resources;
    const authApiKey = getAuthenticationAPIKey(request);
    const coreStart = await core.start();
    const savedObjectsClient =
      coreStart.savedObjects.createInternalRepository();

    const savedObservabilityOnboardingState =
      await getObservabilityOnboardingState({
        savedObjectsClient,
        apiKeyId: authApiKey?.apiKeyId as string,
      });

    if (!savedObservabilityOnboardingState) {
      return {
        message:
          'Unable to report setup progress - onboarding session not found.',
      };
    }

    const { id, updatedAt, ...observabilityOnboardingState } =
      savedObservabilityOnboardingState;
    await saveObservabilityOnboardingState({
      savedObjectsClient,
      apiKeyId: authApiKey?.apiKeyId as string,
      observabilityOnboardingState: {
        ...observabilityOnboardingState,
        progress: {
          ...observabilityOnboardingState.progress,
          [name]: status,
        },
      },
    });
    return { name, status };
  },
});

const getProgressRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /internal/observability_onboarding/custom_logs/progress',
  options: { tags: [] },
  params: t.type({
    query: t.type({
      apiKeyId: t.string,
    }),
  }),
  async handler(resources): Promise<{ progress: Record<string, string> }> {
    const {
      params: {
        query: { apiKeyId },
      },
      core,
      request,
    } = resources;
    const coreStart = await core.start();
    const savedObjectsClient =
      coreStart.savedObjects.createInternalRepository();
    const savedObservabilityOnboardingState =
      (await getObservabilityOnboardingState({
        savedObjectsClient,
        apiKeyId,
      })) || null;
    const progress = { ...savedObservabilityOnboardingState?.progress };

    const esClient =
      coreStart.elasticsearch.client.asScoped(request).asCurrentUser;
    if (savedObservabilityOnboardingState) {
      const {
        state: { datasetName: dataset, namespace },
      } = savedObservabilityOnboardingState;
      if (progress['ea-status'] === 'complete') {
        try {
          const hasLogs = await getHasLogs({
            dataset,
            namespace,
            esClient,
          });
          if (hasLogs) {
            progress['logs-ingest'] = 'complete';
          } else {
            progress['logs-ingest'] = 'loading';
          }
        } catch (error) {
          progress['logs-ingest'] = 'warning';
        }
      } else {
        progress['logs-ingest'] = 'incomplete';
      }
    }

    return { progress };
  },
});

export const customLogsRouteRepository = {
  ...logMonitoringPrivilegesRoute,
  ...installShipperSetupRoute,
  ...createApiKeyRoute,
  ...stepProgressUpdateRoute,
  ...getProgressRoute,
};
