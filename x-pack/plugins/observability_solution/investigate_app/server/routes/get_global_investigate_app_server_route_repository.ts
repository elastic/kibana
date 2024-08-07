/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createInvestigateAppServerRoute } from './create_investigate_app_server_route';
import { investigationRepositoryFactory } from '../services/investigation_repository';
import { createInvestigation } from '../services/create_investigation';

const createParamsSchema = t.type({
  body: t.type({
    title: t.string,
  }),
});

const createInvestigationRoute = createInvestigateAppServerRoute({
  endpoint: 'POST /api/observability/investigations 2023-10-31',
  options: {
    tags: [],
  },
  params: createParamsSchema,
  handler: async (params) => {
    const soClient = (await params.context.core).savedObjects.client;
    const repository = investigationRepositoryFactory({ soClient });
    return await createInvestigation(repository);
  },
});

export function getGlobalInvestigateAppServerRouteRepository() {
  return {
    ...createInvestigationRoute,
  };
}

export type InvestigateAppServerRouteRepository = ReturnType<
  typeof getGlobalInvestigateAppServerRouteRepository
>;
