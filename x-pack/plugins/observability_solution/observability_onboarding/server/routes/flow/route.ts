/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import * as t from 'io-ts';
import {
  getObservabilityOnboardingFlow,
  saveObservabilityOnboardingFlow,
} from '../../lib/state';
import {
  ElasticAgentStepPayload,
  ObservabilityOnboardingFlow,
} from '../../saved_objects/observability_onboarding_status';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';
import { getHasLogs } from './get_has_logs';

const updateOnboardingFlowRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'PUT /internal/observability_onboarding/flow/{onboardingId}',
  options: { tags: [] },
  params: t.type({
    path: t.type({
      onboardingId: t.string,
    }),
    body: t.partial({
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
    const { id } = await saveObservabilityOnboardingFlow({
      savedObjectsClient,
      savedObjectId: onboardingId,
      observabilityOnboardingState: {
        type: 'logFiles',
        state,
        progress: {},
      } as ObservabilityOnboardingFlow,
    });
    return { onboardingId: id };
  },
});

const stepProgressUpdateRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'POST /internal/observability_onboarding/flow/{id}/step/{name}',
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
      t.partial({ payload: t.record(t.string, t.unknown) }),
    ]),
  }),
  async handler(resources) {
    const {
      params: {
        path: { id, name },
        body: { status, message, payload },
      },
      core,
    } = resources;

    const coreStart = await core.start();
    const savedObjectsClient =
      coreStart.savedObjects.createInternalRepository();

    const savedObservabilityOnboardingState =
      await getObservabilityOnboardingFlow({
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

    await saveObservabilityOnboardingFlow({
      savedObjectsClient,
      savedObjectId,
      observabilityOnboardingState: {
        ...observabilityOnboardingState,
        progress: {
          ...observabilityOnboardingState.progress,
          [name]: {
            status,
            message,
            payload: payload as unknown as ElasticAgentStepPayload,
          },
        },
      },
    });
    return { name, status, message, payload };
  },
});

const getProgressRoute = createObservabilityOnboardingServerRoute({
  endpoint:
    'GET /internal/observability_onboarding/flow/{onboardingId}/progress',
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
      await getObservabilityOnboardingFlow({
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

    const type = savedObservabilityOnboardingState.type;

    if (progress['ea-status']?.status === 'complete') {
      try {
        const hasLogs = await getHasLogs({
          type,
          state: savedObservabilityOnboardingState.state,
          esClient,
          payload: progress['ea-status']?.payload,
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

export const flowRouteRepository = {
  ...updateOnboardingFlowRoute,
  ...stepProgressUpdateRoute,
  ...getProgressRoute,
};
