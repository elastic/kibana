/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import type { Client } from '@elastic/elasticsearch';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';
import { getESHosts } from './get_es_hosts';
import { getKibanaUrl } from './get_kibana_url';
import { createShipperApiKey } from './create_shipper_api_key';
import { saveObservabilityOnboardingState } from './save_observability_onboarding_state';
import {
  ObservabilityOnboardingState,
  OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
  SavedObservabilityOnboardingState,
} from '../../saved_objects/observability_onboarding_status';
import { getObservabilityOnboardingState } from './get_observability_onboarding_state';
import { findLatestObservabilityOnboardingState } from './find_latest_observability_onboarding_state';

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
    esHost: string;
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
    const scriptDownloadUrl = getKibanaUrl(
      coreStart,
      '/observabilityOnboarding/standalone_agent_setup.sh'
    );
    const apiEndpoint = getKibanaUrl(
      coreStart,
      '/api/observability_onboarding/custom_logs'
    );
    const {
      elasticsearch: { client },
    } = await context.core;
    const { id: apiKeyId, encoded: apiKeyEncoded } = await createShipperApiKey(
      client.asCurrentUser,
      name
    );
    const [esHost] = getESHosts({
      cloudSetup: plugins.cloud.setup,
      esClient: coreStart.elasticsearch.client.asInternalUser as Client,
    });

    const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);

    await saveObservabilityOnboardingState({
      savedObjectsClient,
      apiKeyId,
      observabilityOnboardingState: { state } as ObservabilityOnboardingState,
    });

    return {
      apiKeyId, // key the status off this
      apiKeyEncoded,
      apiEndpoint,
      scriptDownloadUrl,
      esHost,
    };
  },
});

const stepProgressUpdateRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /api/observability_onboarding/custom_logs/step/{name}',
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
      request: {
        headers: { authorization },
      },
      core,
    } = resources;
    if (
      !(
        typeof authorization === 'string' && authorization.startsWith('ApiKey ')
      )
    ) {
      return {
        message:
          'Unable to report setup progress without ApiKey in authorization header.',
      };
    }
    const apiKeyEncoded = authorization.split(' ')[1];
    const [apiKeyId] = Buffer.from(apiKeyEncoded, 'base64')
      .toString('utf8')
      .split(':');
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

const getStateRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /api/observability_onboarding/custom_logs/state',
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
  endpoint: 'GET /api/observability_onboarding/custom_logs/state/latest',
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

const cleanStateRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /api/observability_onboarding/custom_logs/clean_state',
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
  ...createApiKeyRoute,
  ...stepProgressUpdateRoute,
  ...getStateRoute,
  ...getLatestStateRoute,
  ...cleanStateRoute,
};
