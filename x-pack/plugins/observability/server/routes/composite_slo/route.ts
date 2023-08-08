/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import {
  createCompositeSLOParamsSchema,
  deleteCompositeSLOParamsSchema,
  findCompositeSLOParamsSchema,
  getCompositeSLOParamsSchema,
  updateCompositeSLOParamsSchema,
} from '@kbn/slo-schema';

import {
  CreateCompositeSLO,
  DefaultSummaryClient,
  DeleteCompositeSLO,
  FindCompositeSLO,
  KibanaSavedObjectsCompositeSLORepository,
  UpdateCompositeSLO,
} from '../../services/composite_slo';
import { GetCompositeSLO } from '../../services/composite_slo/get_composite_slo';
import { KibanaSavedObjectsSLORepository } from '../../services/slo';
import { ObservabilityRequestHandlerContext } from '../../types';
import { createObservabilityServerRoute } from '../create_observability_server_route';

const assertLicenseAtLeastPlatinum = async (context: ObservabilityRequestHandlerContext) => {
  const { license } = await context.licensing;
  if (!license.hasAtLeast('platinum')) {
    throw badRequest('Platinum license or higher is needed to make use of this feature.');
  }
};

const createCompositeSLORoute = createObservabilityServerRoute({
  endpoint: 'POST /api/observability/composite_slos 2023-05-24',
  options: {
    tags: ['access:slo_write'],
  },
  params: createCompositeSLOParamsSchema,
  handler: async ({ context, params }) => {
    await assertLicenseAtLeastPlatinum(context);

    const soClient = (await context.core).savedObjects.client;
    const compositeSloRepository = new KibanaSavedObjectsCompositeSLORepository(soClient);
    const sloRepository = new KibanaSavedObjectsSLORepository(soClient);
    const createCompositeSLO = new CreateCompositeSLO(compositeSloRepository, sloRepository);

    const response = await createCompositeSLO.execute(params.body);

    return response;
  },
});

const updateCompositeSLORoute = createObservabilityServerRoute({
  endpoint: 'PUT /api/observability/composite_slos/{id} 2023-05-24',
  options: {
    tags: ['access:slo_write'],
  },
  params: updateCompositeSLOParamsSchema,
  handler: async ({ context, params }) => {
    await assertLicenseAtLeastPlatinum(context);

    const soClient = (await context.core).savedObjects.client;
    const compositeSloRepository = new KibanaSavedObjectsCompositeSLORepository(soClient);
    const sloRepository = new KibanaSavedObjectsSLORepository(soClient);
    const updateCompositeSLO = new UpdateCompositeSLO(compositeSloRepository, sloRepository);

    const response = await updateCompositeSLO.execute(params.path.id, params.body);

    return response;
  },
});

const deleteCompositeSLORoute = createObservabilityServerRoute({
  endpoint: 'DELETE /api/observability/composite_slos/{id} 2023-05-24',
  options: {
    tags: ['access:slo_write'],
  },
  params: deleteCompositeSLOParamsSchema,
  handler: async ({ context, params }) => {
    await assertLicenseAtLeastPlatinum(context);

    const soClient = (await context.core).savedObjects.client;
    const compositeSloRepository = new KibanaSavedObjectsCompositeSLORepository(soClient);
    const deleteCompositeSLO = new DeleteCompositeSLO(compositeSloRepository);

    await deleteCompositeSLO.execute(params.path.id);
  },
});

const getCompositeSLORoute = createObservabilityServerRoute({
  endpoint: 'GET /api/observability/composite_slos/{id} 2023-05-24',
  options: {
    tags: ['access:slo_read'],
  },
  params: getCompositeSLOParamsSchema,
  handler: async ({ context, params }) => {
    await assertLicenseAtLeastPlatinum(context);

    const soClient = (await context.core).savedObjects.client;
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;

    const compositeSloRepository = new KibanaSavedObjectsCompositeSLORepository(soClient);
    const summaryClient = new DefaultSummaryClient(esClient);
    const getCompositeSlo = new GetCompositeSLO(compositeSloRepository, summaryClient);

    const response = await getCompositeSlo.execute(params.path.id);

    return response;
  },
});

const findCompositeSLORoute = createObservabilityServerRoute({
  endpoint: 'GET /api/observability/composite_slos 2023-05-24',
  options: {
    tags: ['access:slo_read'],
  },
  params: findCompositeSLOParamsSchema,
  handler: async ({ context, params }) => {
    await assertLicenseAtLeastPlatinum(context);

    const soClient = (await context.core).savedObjects.client;
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const repository = new KibanaSavedObjectsCompositeSLORepository(soClient);
    const summaryClient = new DefaultSummaryClient(esClient);
    const findCompositeSlo = new FindCompositeSLO(repository, summaryClient);

    const response = await findCompositeSlo.execute(params?.query ?? {});

    return response;
  },
});

export const compositeSloRouteRepository = {
  ...createCompositeSLORoute,
  ...updateCompositeSLORoute,
  ...deleteCompositeSLORoute,
  ...getCompositeSLORoute,
  ...findCompositeSLORoute,
};
