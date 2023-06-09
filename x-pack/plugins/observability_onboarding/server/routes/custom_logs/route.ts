/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';
import { createShipperApiKey } from './create_shipper_api_key';
import { saveObservabilityOnboardingState } from './save_observability_onboarding_state';
import { ObservabilityOnboardingState } from '../../saved_objects/observability_onboarding_status';
import { getObservabilityOnboardingState } from './get_observability_onboarding_state';
import { getAuthenticationAPIKey } from '../../lib/get_authentication_api_key';
import { getHasLogs } from './get_has_logs';
import { getCloudUrls } from './get_cloud_urls';
import { getFallbackUrls } from './get_fallback_urls';

const ELASTIC_AGENT_VERSION = '8.8.0'; // This should be defined from a source with the latest public release

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
    apiEndpoint: string;
    scriptDownloadUrl: string;
    elasticAgentVersion: string;
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
    const {
      elasticsearch: { client },
    } = await context.core;
    const { id: apiKeyId, encoded: apiKeyEncoded } = await createShipperApiKey(
      client.asCurrentUser,
      name
    );

    const cloudId = plugins.cloud.setup.cloudId;
    const { kibanaUrl } =
      (cloudId && getCloudUrls(cloudId)) || getFallbackUrls(coreStart);
    const scriptDownloadUrl = `${kibanaUrl}/plugins/observabilityOnboarding/assets/standalone_agent_setup.sh`;
    const apiEndpoint = `${kibanaUrl}/api/observability_onboarding`;

    const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);

    await saveObservabilityOnboardingState({
      savedObjectsClient,
      apiKeyId,
      observabilityOnboardingState: { state } as ObservabilityOnboardingState,
    });

    return {
      apiKeyId,
      apiKeyEncoded,
      apiEndpoint,
      scriptDownloadUrl,
      elasticAgentVersion: ELASTIC_AGENT_VERSION,
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
    const { apiKeyId } = getAuthenticationAPIKey(request);
    const coreStart = await core.start();
    const savedObjectsClient =
      coreStart.savedObjects.createInternalRepository();

    const savedObservabilityOnboardingState =
      await getObservabilityOnboardingState({
        savedObjectsClient,
        apiKeyId,
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
      apiKeyId,
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
  ...createApiKeyRoute,
  ...stepProgressUpdateRoute,
  ...getProgressRoute,
};
