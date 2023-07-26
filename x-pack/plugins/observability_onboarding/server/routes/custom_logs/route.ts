/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import * as t from 'io-ts';
import { ObservabilityOnboardingState } from '../../saved_objects/observability_onboarding_status';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';
import { createShipperApiKey } from './api_key/create_shipper_api_key';
import { hasLogMonitoringPrivileges } from './api_key/has_log_monitoring_privileges';
import { getFallbackKibanaUrl } from './get_fallback_urls';
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
      core.setup.http.basePath.publicBaseUrl ?? // priority given to server.publicBaseUrl
      plugins.cloud?.setup?.kibanaUrl ?? // then cloud id
      getFallbackKibanaUrl(coreStart); // falls back to local network binding
    const scriptDownloadUrl = `${kibanaUrl}/plugins/observabilityOnboarding/assets/standalone_agent_setup.sh`;
    const apiEndpoint = `${kibanaUrl}/internal/observability_onboarding`;

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
  async handler(
    resources
  ): Promise<{ apiKeyEncoded: string; onboardingId: string }> {
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
    const { encoded: apiKeyEncoded } = await createShipperApiKey(
      client.asCurrentUser,
      name
    );

    const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);

    const { id } = await saveObservabilityOnboardingState({
      savedObjectsClient,
      observabilityOnboardingState: {
        state: state as ObservabilityOnboardingState['state'],
        progress: {},
      },
    });

    return { apiKeyEncoded, onboardingId: id };
  },
});

const updateOnboardingStateRoute = createObservabilityOnboardingServerRoute({
  endpoint:
    'PUT /internal/observability_onboarding/custom_logs/{onboardingId}/save',
  options: { tags: [] },
  params: t.type({
    path: t.type({
      onboardingId: t.string,
    }),
    body: t.type({
      state: t.record(t.string, t.unknown),
    }),
  }),
  async handler(resources): Promise<{ onboardingId: string }> {
    const {
      params: {
        path: { onboardingId },
        body: { state },
      },
      core,
      request,
    } = resources;
    const coreStart = await core.start();
    const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
    const { id } = await saveObservabilityOnboardingState({
      savedObjectsClient,
      savedObjectId: onboardingId,
      observabilityOnboardingState: { state } as ObservabilityOnboardingState,
    });
    return { onboardingId: id };
  },
});

const stepProgressUpdateRoute = createObservabilityOnboardingServerRoute({
  endpoint:
    'POST /internal/observability_onboarding/custom_logs/{id}/step/{name}',
  options: { tags: [] },
  params: t.type({
    path: t.type({
      id: t.string,
      name: t.string,
    }),
    body: t.intersection([
      t.type({
        status: t.string,
      }),
      t.partial({ message: t.string }),
    ]),
  }),
  async handler(resources) {
    const {
      params: {
        path: { id, name },
        body: { status, message },
      },
      core,
    } = resources;
    const coreStart = await core.start();
    const savedObjectsClient =
      coreStart.savedObjects.createInternalRepository();

    const savedObservabilityOnboardingState =
      await getObservabilityOnboardingState({
        savedObjectsClient,
        savedObjectId: id,
      });

    if (!savedObservabilityOnboardingState) {
      throw Boom.notFound(
        'Unable to report setup progress - onboarding session not found.'
      );
    }

    const {
      id: savedObjectId,
      updatedAt,
      ...observabilityOnboardingState
    } = savedObservabilityOnboardingState;

    await saveObservabilityOnboardingState({
      savedObjectsClient,
      savedObjectId,
      observabilityOnboardingState: {
        ...observabilityOnboardingState,
        progress: {
          ...observabilityOnboardingState.progress,
          [name]: { status, message },
        },
      },
    });
    return { name, status, message };
  },
});

const getProgressRoute = createObservabilityOnboardingServerRoute({
  endpoint:
    'GET /internal/observability_onboarding/custom_logs/{onboardingId}/progress',
  options: { tags: [] },
  params: t.type({
    path: t.type({
      onboardingId: t.string,
    }),
  }),
  async handler(resources): Promise<{
    progress: Record<string, { status: string; message?: string }>;
  }> {
    const {
      params: {
        path: { onboardingId },
      },
      core,
      request,
    } = resources;
    const coreStart = await core.start();
    const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
    const savedObservabilityOnboardingState =
      await getObservabilityOnboardingState({
        savedObjectsClient,
        savedObjectId: onboardingId,
      });

    if (!savedObservabilityOnboardingState) {
      throw Boom.notFound(
        'Unable to report setup progress - onboarding session not found.'
      );
    }

    const progress = { ...savedObservabilityOnboardingState?.progress };

    const esClient =
      coreStart.elasticsearch.client.asScoped(request).asCurrentUser;

    const {
      state: { datasetName: dataset, namespace },
    } = savedObservabilityOnboardingState;
    if (progress['ea-status']?.status === 'complete') {
      try {
        const hasLogs = await getHasLogs({
          dataset,
          namespace,
          esClient,
        });
        if (hasLogs) {
          progress['logs-ingest'] = { status: 'complete' };
        } else {
          progress['logs-ingest'] = { status: 'loading' };
        }
      } catch (error) {
        progress['logs-ingest'] = { status: 'warning', message: error.message };
      }
    } else {
      progress['logs-ingest'] = { status: 'incomplete' };
    }

    return { progress };
  },
});

export const customLogsRouteRepository = {
  ...logMonitoringPrivilegesRoute,
  ...installShipperSetupRoute,
  ...createApiKeyRoute,
  ...updateOnboardingStateRoute,
  ...stepProgressUpdateRoute,
  ...getProgressRoute,
};
