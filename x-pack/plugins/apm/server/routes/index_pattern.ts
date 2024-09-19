/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStaticIndexPattern } from '../lib/index_pattern/create_static_index_pattern';
import { createApmServerRouteRepository } from './create_apm_server_route_repository';
import { setupRequest } from '../lib/helpers/setup_request';
import { getDynamicIndexPattern } from '../lib/index_pattern/get_dynamic_index_pattern';
import { createApmServerRoute } from './create_apm_server_route';

const staticIndexPatternRoute = createApmServerRoute({
  endpoint: 'POST /api/apm/index_pattern/static',
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const {
      request,
      core,
      plugins: { spaces },
      config,
    } = resources;

    const [setup, savedObjectsClient] = await Promise.all([
      setupRequest(resources),
      core
        .start()
        .then((coreStart) => coreStart.savedObjects.createInternalRepository()),
    ]);

    const spaceId = spaces?.setup.spacesService.getSpaceId(request);

    const didCreateIndexPattern = await createStaticIndexPattern({
      setup,
      config,
      savedObjectsClient,
      spaceId,
    });

    return { created: didCreateIndexPattern };
  },
});

const dynamicIndexPatternRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/index_pattern/dynamic',
  options: { tags: ['access:apm'] },
  handler: async ({ context, config, logger }) => {
    const dynamicIndexPattern = await getDynamicIndexPattern({
      context,
      config,
      logger,
    });
    return { dynamicIndexPattern };
  },
});

export const indexPatternRouteRepository = createApmServerRouteRepository()
  .add(staticIndexPatternRoute)
  .add(dynamicIndexPatternRoute);
