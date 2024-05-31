/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uiSettings } from '@kbn/observability-plugin/server';
import { createApmServerRoute } from '../../apm_routes/create_apm_server_route';

const getLabsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/settings/labs',
  options: { tags: ['access:apm'] },
  handler: async (): Promise<{ labsItems: string[] }> => {
    const labsItems = Object.entries(uiSettings)
      .filter(([key, value]): boolean | undefined => value.showInLabs)
      .map(([key]): string => key);
    return { labsItems };
  },
});

export const labsRouteRepository = getLabsRoute;
