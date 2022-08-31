/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSloParamsSchema } from '../../schema';
import { createObservabilityServerRoute } from '../create_observability_server_route';

const createSLORoute = createObservabilityServerRoute({
  endpoint: 'POST /api/observability/slos',
  options: {
    tags: [],
  },
  params: createSloParamsSchema,
  handler: async ({ context, request, params }) => {
    return { success: true };
  },
});

export const slosRouteRepository = createSLORoute;
