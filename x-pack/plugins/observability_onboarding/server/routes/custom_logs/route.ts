/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';
import * as t from 'io-ts';
import { getAuthenticationAPIKey } from '../../lib/get_authentication_api_key';
import {
  ObservabilityOnboardingState,
  OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
  SavedObservabilityOnboardingState,
} from '../../saved_objects/observability_onboarding_status';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';
import { createShipperApiKey } from './create_shipper_api_key';
import { findLatestObservabilityOnboardingState } from './find_latest_observability_onboarding_state';
import { getESHosts } from './get_es_hosts';
import { getKibanaUrl } from './get_kibana_url';
import { getObservabilityOnboardingState } from './get_observability_onboarding_state';
import { hasLogMonitoringPrivileges } from './has_log_monitoring_privileges';
import { saveObservabilityOnboardingState } from './save_observability_onboarding_state';

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
    esHost: string;
  }> {
    const { core, plugins } = resources;
    const coreStart = await core.start();
    const scriptDownloadUrl = getKibanaUrl(
      coreStart,
      '/plugins/observabilityOnboarding/assets/standalone_agent_setup.sh'
    );
    const apiEndpoint = getKibanaUrl(
      coreStart,
      '/api/observability_onboarding/custom_logs'
    );

    const [esHost] = getESHosts({
      cloudSetup: plugins.cloud.setup,
      esClient: coreStart.elasticsearch.client.asInternalUser as Client,
    });

    return {
      apiEndpoint,
      scriptDownloadUrl,
      esHost,
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
      apiKeyId, // key the status off this
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

const getStateRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /internal/observability_onboarding/custom_logs/state',
  options: { tags: [] },
  params: t.type({
    query: t.type({
      apiKeyId: t.string,
    }),
  }),
  async handler(resources): Promise<{
    savedObservabilityOnboardingState: SavedObservabilityOnboardingState | null;
  }> {
    const {
      params: {
        query: { apiKeyId },
      },
      core,
    } = resources;
    const coreStart = await core.start();
    const savedObjectsClient =
      coreStart.savedObjects.createInternalRepository();
    const savedObservabilityOnboardingState =
      (await getObservabilityOnboardingState({
        savedObjectsClient,
        apiKeyId,
      })) || null;
    return { savedObservabilityOnboardingState };
  },
});

const getLatestStateRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /internal/observability_onboarding/custom_logs/state/latest',
  options: { tags: [] },
  async handler(resources): Promise<{
    savedObservabilityOnboardingState: SavedObservabilityOnboardingState | null;
  }> {
    const { core } = resources;
    const coreStart = await core.start();
    const savedObjectsClient =
      coreStart.savedObjects.createInternalRepository();
    const savedObservabilityOnboardingState =
      (await findLatestObservabilityOnboardingState({ savedObjectsClient })) ||
      null;
    return { savedObservabilityOnboardingState };
  },
});

const customLogsExistsRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /internal/observability_onboarding/custom_logs/exists',
  options: { tags: [] },
  params: t.type({
    query: t.type({
      dataset: t.string,
      namespace: t.string,
    }),
  }),
  async handler(resources): Promise<{ exists: boolean }> {
    const {
      core,
      request,
      params: {
        query: { dataset, namespace },
      },
    } = resources;
    const coreStart = await core.start();
    const esClient =
      coreStart.elasticsearch.client.asScoped(request).asCurrentUser;
    try {
      const { hits } = await esClient.search({
        index: `logs-${dataset}-${namespace}`,
        terminate_after: 1,
      });
      const total = hits.total as { value: number };
      return { exists: total.value > 0 };
    } catch (error) {
      if (error.statusCode === 404) {
        return { exists: false };
      }
      throw Boom.boomify(error, {
        statusCode: error.statusCode,
        message: error.message,
        data: error.body,
      });
    }
  },
});

const deleteStatesRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'DELETE /internal/observability_onboarding/custom_logs/states',
  options: { tags: [] },
  async handler(resources): Promise<object> {
    const { core } = resources;
    const coreStart = await core.start();
    const savedObjectsClient =
      coreStart.savedObjects.createInternalRepository();
    const findStatesResult =
      await savedObjectsClient.find<ObservabilityOnboardingState>({
        type: OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
      });
    const bulkDeleteResult = await savedObjectsClient.bulkDelete(
      findStatesResult.saved_objects
    );
    return { bulkDeleteResult };
  },
});

export const customLogsRouteRepository = {
  ...logMonitoringPrivilegesRoute,
  ...installShipperSetupRoute,
  ...createApiKeyRoute,
  ...stepProgressUpdateRoute,
  ...getStateRoute,
  ...getLatestStateRoute,
  ...customLogsExistsRoute,
  ...deleteStatesRoute,
};
