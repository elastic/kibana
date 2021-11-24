/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStaticDataView } from './create_static_data_view';
import { createApmServerRouteRepository } from '../apm_routes/create_apm_server_route_repository';
import { setupRequest } from '../../lib/helpers/setup_request';
import { getDynamicDataView } from './get_dynamic_data_view';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';

const staticDataViewRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/data_view/static',
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

    const didCreateDataView = await createStaticDataView({
      setup,
      config,
      savedObjectsClient,
      spaceId,
    });

    return { created: didCreateDataView };
  },
});

const dynamicDataViewRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/data_view/dynamic',
  options: { tags: ['access:apm'] },
  handler: async ({ context, config, logger }) => {
    const dynamicDataView = await getDynamicDataView({
      context,
      config,
      logger,
    });
    return { dynamicDataView };
  },
});

export const dataViewRouteRepository = createApmServerRouteRepository()
  .add(staticDataViewRoute)
  .add(dynamicDataViewRoute);
