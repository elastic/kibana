/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RouteRegisterParameters } from '../register_routes';

export function registerFlameChartRoutes({ router }: RouteRegisterParameters) {
  router.get(
    {
      path: '/internal/profiling_data_access/flamechart',
      options: { tags: ['access:profiling'] },
      validate: false,
    },
    async (context, request, response) => {
      return response.ok({ body: 'foo' });
    }
  );
}
