/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createInvestigationNoteParamsSchema,
  createInvestigationParamsSchema,
  deleteInvestigationNoteParamsSchema,
  deleteInvestigationParamsSchema,
  findInvestigationsParamsSchema,
  getInvestigationNotesParamsSchema,
  getInvestigationParamsSchema,
} from '@kbn/investigation-shared';
import { createInvestigation } from '../services/create_investigation';
import { createInvestigationNote } from '../services/create_investigation_note';
import { deleteInvestigation } from '../services/delete_investigation';
import { findInvestigations } from '../services/find_investigations';
import { getInvestigation } from '../services/get_investigation';
import { getInvestigationNotes } from '../services/get_investigation_notes';
import { investigationRepositoryFactory } from '../services/investigation_repository';
import { createInvestigateAppServerRoute } from './create_investigate_app_server_route';
import { deleteInvestigationNote } from '../services/delete_investigation_note';

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
  endpoint: 'GET /api/observability/investigations/{id} 2023-10-31',
  options: {
    tags: [],
  },
  params: getInvestigationParamsSchema,
  handler: async (params) => {
    const soClient = (await params.context.core).savedObjects.client;
    const repository = investigationRepositoryFactory({ soClient, logger: params.logger });

    return await getInvestigation(params.params.path, repository);
  },
});

const deleteInvestigationRoute = createInvestigateAppServerRoute({
  endpoint: 'DELETE /api/observability/investigations/{id} 2023-10-31',
  options: {
    tags: [],
  },
  params: deleteInvestigationParamsSchema,
  handler: async (params) => {
    const soClient = (await params.context.core).savedObjects.client;
    const repository = investigationRepositoryFactory({ soClient, logger: params.logger });

    return await deleteInvestigation(params.params.path.id, repository);
  },
});

const createInvestigationNoteRoute = createInvestigateAppServerRoute({
  endpoint: 'POST /api/observability/investigations/{id}/notes 2023-10-31',
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

    return await createInvestigationNote(params.path.id, params.body, { repository, user });
  },
});

const getInvestigationNotesRoute = createInvestigateAppServerRoute({
  endpoint: 'GET /api/observability/investigations/{id}/notes 2023-10-31',
  options: {
    tags: [],
  },
  params: getInvestigationNotesParamsSchema,
  handler: async (params) => {
    const soClient = (await params.context.core).savedObjects.client;
    const repository = investigationRepositoryFactory({ soClient, logger: params.logger });

    return await getInvestigationNotes(params.params.path.id, repository);
  },
});

const deleteInvestigationNotesRoute = createInvestigateAppServerRoute({
  endpoint: 'DELETE /api/observability/investigations/{id}/notes/{noteId} 2023-10-31',
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

    return await deleteInvestigationNote(params.path.id, params.path.noteId, {
      repository,
      user,
    });
  },
});

export function getGlobalInvestigateAppServerRouteRepository() {
  return {
    ...createInvestigationRoute,
    ...findInvestigationsRoute,
    ...getInvestigationRoute,
    ...deleteInvestigationRoute,
    ...createInvestigationNoteRoute,
    ...getInvestigationNotesRoute,
    ...deleteInvestigationNotesRoute,
  };
}

export type InvestigateAppServerRouteRepository = ReturnType<
  typeof getGlobalInvestigateAppServerRouteRepository
>;
