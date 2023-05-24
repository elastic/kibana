/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, notImplemented } from '@hapi/boom';
import {
  createCompositeSLOParamsSchema,
  deleteCompositeSLOParamsSchema,
  findCompositeSLOParamsSchema,
  getCompositeSLOParamsSchema,
  updateCompositeSLOParamsSchema,
} from '@kbn/slo-schema';

import { ObservabilityRequestHandlerContext } from '../../types';
import { createObservabilityServerRoute } from '../create_observability_server_route';

const assertLicenseAtLeastPlatinum = async (context: ObservabilityRequestHandlerContext) => {
  const { license } = await context.licensing;
  if (!license.hasAtLeast('platinum')) {
    throw badRequest('Platinum license or higher is needed to make use of this feature.');
  }
};

const createCompositeSLORoute = createObservabilityServerRoute({
  endpoint: 'POST /api/observability/composite_slos',
  options: {
    tags: ['access:slo_write'],
  },
  params: createCompositeSLOParamsSchema,
  handler: async ({ context }) => {
    await assertLicenseAtLeastPlatinum(context);

    throw notImplemented();
  },
});

const updateCompositeSLORoute = createObservabilityServerRoute({
  endpoint: 'PUT /api/observability/composite_slos/{id}',
  options: {
    tags: ['access:slo_write'],
  },
  params: updateCompositeSLOParamsSchema,
  handler: async ({ context }) => {
    await assertLicenseAtLeastPlatinum(context);

    throw notImplemented();
  },
});

const deleteCompositeSLORoute = createObservabilityServerRoute({
  endpoint: 'DELETE /api/observability/composite_slos/{id}',
  options: {
    tags: ['access:slo_write'],
  },
  params: deleteCompositeSLOParamsSchema,
  handler: async ({ context }) => {
    await assertLicenseAtLeastPlatinum(context);

    throw notImplemented();
  },
});

const getCompositeSLORoute = createObservabilityServerRoute({
  endpoint: 'GET /api/observability/composite_slos/{id}',
  options: {
    tags: ['access:slo_read'],
  },
  params: getCompositeSLOParamsSchema,
  handler: async ({ context }) => {
    await assertLicenseAtLeastPlatinum(context);

    throw notImplemented();
  },
});

const findCompositeSLORoute = createObservabilityServerRoute({
  endpoint: 'GET /api/observability/composite_slos',
  options: {
    tags: ['access:slo_read'],
  },
  params: findCompositeSLOParamsSchema,
  handler: async ({ context }) => {
    await assertLicenseAtLeastPlatinum(context);

    throw notImplemented();
  },
});

export const compositeSloRouteRepository = {
  ...createCompositeSLORoute,
  ...updateCompositeSLORoute,
  ...deleteCompositeSLORoute,
  ...getCompositeSLORoute,
  ...findCompositeSLORoute,
};
