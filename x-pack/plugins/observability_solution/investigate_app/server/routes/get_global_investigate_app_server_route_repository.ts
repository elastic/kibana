/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createInvestigationItemParamsSchema,
  createInvestigationNoteParamsSchema,
  createInvestigationParamsSchema,
  deleteInvestigationItemParamsSchema,
  deleteInvestigationNoteParamsSchema,
  deleteInvestigationParamsSchema,
  findInvestigationsParamsSchema,
  getAllInvestigationStatsParamsSchema,
  getAllInvestigationTagsParamsSchema,
  getInvestigationItemsParamsSchema,
  getInvestigationNotesParamsSchema,
  getInvestigationParamsSchema,
  updateInvestigationItemParamsSchema,
  updateInvestigationNoteParamsSchema,
  updateInvestigationParamsSchema,
  getEventsParamsSchema,
  GetEventsResponse,
  getEntitiesParamsSchema,
  GetEntitiesResponse,
} from '@kbn/investigation-shared';
import { ScopedAnnotationsClient } from '@kbn/observability-plugin/server';
import { createInvestigation } from '../services/create_investigation';
import { createInvestigationItem } from '../services/create_investigation_item';
import { createInvestigationNote } from '../services/create_investigation_note';
import { deleteInvestigation } from '../services/delete_investigation';
import { deleteInvestigationItem } from '../services/delete_investigation_item';
import { deleteInvestigationNote } from '../services/delete_investigation_note';
import { findInvestigations } from '../services/find_investigations';
import { getAllInvestigationTags } from '../services/get_all_investigation_tags';
import { getInvestigation } from '../services/get_investigation';
import { getInvestigationItems } from '../services/get_investigation_items';
import { getInvestigationNotes } from '../services/get_investigation_notes';
import { investigationRepositoryFactory } from '../services/investigation_repository';
import { updateInvestigation } from '../services/update_investigation';
import { getAlertEvents, getAnnotationEvents } from '../services/get_events';
import { AlertsClient, getAlertsClient } from '../services/get_alerts_client';
import { updateInvestigationItem } from '../services/update_investigation_item';
import { updateInvestigationNote } from '../services/update_investigation_note';
import { createInvestigateAppServerRoute } from './create_investigate_app_server_route';
import { getAllInvestigationStats } from '../services/get_all_investigation_stats';
import { getEntitiesWithSource } from '../services/get_entities';
import { createEntitiesESClient } from '../clients/create_entities_es_client';

const createInvestigationRoute = createInvestigateAppServerRoute({
  endpoint: 'POST /api/observability/investigations 2023-10-31',
  options: {
    tags: [],
  },
  params: createInvestigationParamsSchema,
  handler: async ({ params, context, request, logger }) => {
    const user = (await context.core).coreStart.security.authc.getCurrentUser(request);
    if (!user) {
      throw new Error('User is not authenticated');
    }
    const soClient = (await context.core).savedObjects.client;
    const repository = investigationRepositoryFactory({ soClient, logger });

    return await createInvestigation(params.body, { repository, user });
  },
});

const findInvestigationsRoute = createInvestigateAppServerRoute({
  endpoint: 'GET /api/observability/investigations 2023-10-31',
  options: {
    tags: [],
  },
  params: findInvestigationsParamsSchema,
  handler: async (params) => {
    const soClient = (await params.context.core).savedObjects.client;
    const repository = investigationRepositoryFactory({ soClient, logger: params.logger });

    return await findInvestigations(params.params?.query ?? {}, repository);
  },
});

const getInvestigationRoute = createInvestigateAppServerRoute({
  endpoint: 'GET /api/observability/investigations/{investigationId} 2023-10-31',
  options: {
    tags: [],
  },
  params: getInvestigationParamsSchema,
  handler: async ({ params, context, logger }) => {
    const soClient = (await context.core).savedObjects.client;
    const repository = investigationRepositoryFactory({ soClient, logger });

    return await getInvestigation(params.path, repository);
  },
});

const updateInvestigationRoute = createInvestigateAppServerRoute({
  endpoint: 'PUT /api/observability/investigations/{investigationId} 2023-10-31',
  options: {
    tags: [],
  },
  params: updateInvestigationParamsSchema,
  handler: async ({ params, context, request, logger }) => {
    const user = (await context.core).coreStart.security.authc.getCurrentUser(request);
    if (!user) {
      throw new Error('User is not authenticated');
    }
    const soClient = (await context.core).savedObjects.client;
    const repository = investigationRepositoryFactory({ soClient, logger });

    return await updateInvestigation(params.path.investigationId, params.body ?? {}, {
      repository,
      user,
    });
  },
});

const deleteInvestigationRoute = createInvestigateAppServerRoute({
  endpoint: 'DELETE /api/observability/investigations/{investigationId} 2023-10-31',
  options: {
    tags: [],
  },
  params: deleteInvestigationParamsSchema,
  handler: async ({ params, context, logger }) => {
    const soClient = (await context.core).savedObjects.client;
    const repository = investigationRepositoryFactory({ soClient, logger });

    return await deleteInvestigation(params.path.investigationId, repository);
  },
});

const createInvestigationNoteRoute = createInvestigateAppServerRoute({
  endpoint: 'POST /api/observability/investigations/{investigationId}/notes 2023-10-31',
  options: {
    tags: [],
  },
  params: createInvestigationNoteParamsSchema,
  handler: async ({ params, context, request, logger }) => {
    const user = (await context.core).coreStart.security.authc.getCurrentUser(request);
    if (!user) {
      throw new Error('User is not authenticated');
    }
    const soClient = (await context.core).savedObjects.client;
    const repository = investigationRepositoryFactory({ soClient, logger });

    return await createInvestigationNote(params.path.investigationId, params.body, {
      repository,
      user,
    });
  },
});

const getAllInvestigationTagsRoute = createInvestigateAppServerRoute({
  endpoint: 'GET /api/observability/investigations/_tags 2023-10-31',
  options: {
    tags: [],
  },
  params: getAllInvestigationTagsParamsSchema,
  handler: async ({ params, context, request, logger }) => {
    const soClient = (await context.core).savedObjects.client;
    const repository = investigationRepositoryFactory({ soClient, logger });

    return await getAllInvestigationTags(repository);
  },
});

const getAllInvestigationStatsRoute = createInvestigateAppServerRoute({
  endpoint: 'GET /api/observability/investigations/_stats 2023-10-31',
  options: {
    tags: [],
  },
  params: getAllInvestigationStatsParamsSchema,
  handler: async ({ params, context, request, logger }) => {
    const soClient = (await context.core).savedObjects.client;
    const repository = investigationRepositoryFactory({ soClient, logger });

    return await getAllInvestigationStats(repository);
  },
});

const getInvestigationNotesRoute = createInvestigateAppServerRoute({
  endpoint: 'GET /api/observability/investigations/{investigationId}/notes 2023-10-31',
  options: {
    tags: [],
  },
  params: getInvestigationNotesParamsSchema,
  handler: async ({ params, context, request, logger }) => {
    const soClient = (await context.core).savedObjects.client;
    const repository = investigationRepositoryFactory({ soClient, logger });

    return await getInvestigationNotes(params.path.investigationId, repository);
  },
});

const updateInvestigationNoteRoute = createInvestigateAppServerRoute({
  endpoint: 'PUT /api/observability/investigations/{investigationId}/notes/{noteId} 2023-10-31',
  options: {
    tags: [],
  },
  params: updateInvestigationNoteParamsSchema,
  handler: async ({ params, context, request, logger }) => {
    const user = (await context.core).coreStart.security.authc.getCurrentUser(request);
    if (!user) {
      throw new Error('User is not authenticated');
    }
    const soClient = (await context.core).savedObjects.client;
    const repository = investigationRepositoryFactory({ soClient, logger });

    return await updateInvestigationNote(
      params.path.investigationId,
      params.path.noteId,
      params.body,
      {
        repository,
        user,
      }
    );
  },
});

const deleteInvestigationNoteRoute = createInvestigateAppServerRoute({
  endpoint: 'DELETE /api/observability/investigations/{investigationId}/notes/{noteId} 2023-10-31',
  options: {
    tags: [],
  },
  params: deleteInvestigationNoteParamsSchema,
  handler: async ({ params, context, request, logger }) => {
    const user = (await context.core).coreStart.security.authc.getCurrentUser(request);
    if (!user) {
      throw new Error('User is not authenticated');
    }
    const soClient = (await context.core).savedObjects.client;
    const repository = investigationRepositoryFactory({ soClient, logger });

    return await deleteInvestigationNote(params.path.investigationId, params.path.noteId, {
      repository,
      user,
    });
  },
});

const createInvestigationItemRoute = createInvestigateAppServerRoute({
  endpoint: 'POST /api/observability/investigations/{investigationId}/items 2023-10-31',
  options: {
    tags: [],
  },
  params: createInvestigationItemParamsSchema,
  handler: async ({ params, context, request, logger }) => {
    const user = (await context.core).coreStart.security.authc.getCurrentUser(request);
    if (!user) {
      throw new Error('User is not authenticated');
    }
    const soClient = (await context.core).savedObjects.client;
    const repository = investigationRepositoryFactory({ soClient, logger });

    return await createInvestigationItem(params.path.investigationId, params.body, {
      repository,
      user,
    });
  },
});

const getInvestigationItemsRoute = createInvestigateAppServerRoute({
  endpoint: 'GET /api/observability/investigations/{investigationId}/items 2023-10-31',
  options: {
    tags: [],
  },
  params: getInvestigationItemsParamsSchema,
  handler: async ({ params, context, request, logger }) => {
    const soClient = (await context.core).savedObjects.client;
    const repository = investigationRepositoryFactory({ soClient, logger });

    return await getInvestigationItems(params.path.investigationId, repository);
  },
});

const updateInvestigationItemRoute = createInvestigateAppServerRoute({
  endpoint: 'PUT /api/observability/investigations/{investigationId}/items/{itemId} 2023-10-31',
  options: {
    tags: [],
  },
  params: updateInvestigationItemParamsSchema,
  handler: async ({ params, context, request, logger }) => {
    const user = (await context.core).coreStart.security.authc.getCurrentUser(request);
    if (!user) {
      throw new Error('User is not authenticated');
    }
    const soClient = (await context.core).savedObjects.client;
    const repository = investigationRepositoryFactory({ soClient, logger });

    return await updateInvestigationItem(
      params.path.investigationId,
      params.path.itemId,
      params.body,
      {
        repository,
        user,
      }
    );
  },
});

const deleteInvestigationItemRoute = createInvestigateAppServerRoute({
  endpoint: 'DELETE /api/observability/investigations/{investigationId}/items/{itemId} 2023-10-31',
  options: {
    tags: [],
  },
  params: deleteInvestigationItemParamsSchema,
  handler: async ({ params, context, request, logger }) => {
    const user = (await context.core).coreStart.security.authc.getCurrentUser(request);
    if (!user) {
      throw new Error('User is not authenticated');
    }
    const soClient = (await context.core).savedObjects.client;
    const repository = investigationRepositoryFactory({ soClient, logger });

    return await deleteInvestigationItem(params.path.investigationId, params.path.itemId, {
      repository,
      user,
    });
  },
});

const getEventsRoute = createInvestigateAppServerRoute({
  endpoint: 'GET /api/observability/events 2023-10-31',
  options: {
    tags: [],
  },
  params: getEventsParamsSchema,
  handler: async ({ params, context, request, plugins }) => {
    const annotationsClient: ScopedAnnotationsClient | undefined =
      await plugins.observability.setup.getScopedAnnotationsClient(context, request);
    const alertsClient: AlertsClient = await getAlertsClient({ plugins, request });
    const events: GetEventsResponse = [];

    const includeAllEventTypes = !params?.query?.eventTypes || params.query.eventTypes.length === 0;

    if (
      annotationsClient &&
      (includeAllEventTypes || params?.query?.eventTypes?.includes('annotation'))
    ) {
      const annotationEvents = await getAnnotationEvents(params?.query ?? {}, annotationsClient);
      events.push(...annotationEvents);
    }

    if (alertsClient && (includeAllEventTypes || params?.query?.eventTypes?.includes('alert'))) {
      const alertEvents = await getAlertEvents(params?.query ?? {}, alertsClient);
      events.push(...alertEvents);
    }

    return events;
  },
});

const getEntitiesRoute = createInvestigateAppServerRoute({
  endpoint: 'GET /api/observability/investigation/entities 2023-10-31',
  options: {
    tags: [],
  },
  params: getEntitiesParamsSchema,
  handler: async ({ params, context, request }): Promise<GetEntitiesResponse> => {
    const core = await context.core;
    const esClient = core.elasticsearch.client.asCurrentUser;
    const entitiesEsClient = createEntitiesESClient({ request, esClient });

    const {
      'service.name': serviceName,
      'service.environment': serviceEnvironment,
      'container.id': containerId,
      'host.name': hostName,
    } = params?.query ?? {};

    const { entities } = await getEntitiesWithSource({
      serviceName,
      serviceEnvironment,
      containerId,
      hostName,
      entitiesEsClient,
      esClient,
    });

    return {
      entities,
    };
  },
});

export function getGlobalInvestigateAppServerRouteRepository() {
  return {
    ...createInvestigationRoute,
    ...findInvestigationsRoute,
    ...getInvestigationRoute,
    ...updateInvestigationRoute,
    ...deleteInvestigationRoute,
    ...createInvestigationNoteRoute,
    ...getInvestigationNotesRoute,
    ...updateInvestigationNoteRoute,
    ...deleteInvestigationNoteRoute,
    ...createInvestigationItemRoute,
    ...deleteInvestigationItemRoute,
    ...updateInvestigationItemRoute,
    ...getInvestigationItemsRoute,
    ...getEventsRoute,
    ...getEntitiesRoute,
    ...getAllInvestigationStatsRoute,
    ...getAllInvestigationTagsRoute,
  };
}

export type InvestigateAppServerRouteRepository = ReturnType<
  typeof getGlobalInvestigateAppServerRouteRepository
>;
