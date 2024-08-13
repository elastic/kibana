/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findInvestigationsByAlertParamsSchema } from '@kbn/investigate-plugin/common';
import { createInvestigationParamsSchema } from '@kbn/investigate-plugin/common';
import { findInvestigationsParamsSchema } from '@kbn/investigate-plugin/common';
import { getInvestigationParamsSchema } from '@kbn/investigate-plugin/common';
import { createInvestigation } from '../services/create_investigation';
import { investigationRepositoryFactory } from '../services/investigation_repository';
import { createInvestigateAppServerRoute } from './create_investigate_app_server_route';
import { findInvestigations } from '../services/find_investigations';
import { getInvestigation } from '../services/get_investigation';
import { findInvestigationsByAlert } from '../services/find_investigation_by_alert';

const createInvestigationRoute = createInvestigateAppServerRoute({
  endpoint: 'POST /api/observability/investigations 2023-10-31',
  options: {
    tags: [],
  },
  params: createInvestigationParamsSchema,
  handler: async (params) => {
    const soClient = (await params.context.core).savedObjects.client;
    const repository = investigationRepositoryFactory({ soClient, logger: params.logger });

    return await createInvestigation(params.params.body, repository);
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

const findInvestigationsByAlertRoute = createInvestigateAppServerRoute({
  endpoint: 'GET /api/observability/investigations/alert/{alertId} 2023-10-31',
  options: {
    tags: [],
  },
  params: findInvestigationsByAlertParamsSchema,
  handler: async (params) => {
    const soClient = (await params.context.core).savedObjects.client;
    const repository = investigationRepositoryFactory({ soClient, logger: params.logger });

    return await findInvestigationsByAlert(params.params.path, repository);
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

export function getGlobalInvestigateAppServerRouteRepository() {
  return {
    ...createInvestigationRoute,
    ...findInvestigationsRoute,
    ...getInvestigationRoute,
    ...findInvestigationsByAlertRoute,
  };
}

export type InvestigateAppServerRouteRepository = ReturnType<
  typeof getGlobalInvestigateAppServerRouteRepository
>;
