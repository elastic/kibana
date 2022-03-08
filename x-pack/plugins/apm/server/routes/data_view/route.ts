/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStaticDataView } from './create_static_data_view';
import { setupRequest } from '../../lib/helpers/setup_request';
import { getDynamicDataView } from './get_dynamic_data_view';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { ISavedObjectsRepository } from '../../../../../../src/core/server';

const staticDataViewRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/data_view/static',
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<{ created: boolean }> => {
    const {
      request,
      core,
      plugins: { spaces },
      config,
    } = resources;

    const setupPromise = setupRequest(resources);
    const clientPromise = core
      .start()
      .then(
        (coreStart): ISavedObjectsRepository =>
          coreStart.savedObjects.createInternalRepository()
      );

    const setup = await setupPromise;
    const savedObjectsClient = await clientPromise;

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
  handler: async ({
    context,
    config,
    logger,
  }): Promise<{
    dynamicDataView:
      | import('./get_dynamic_data_view').DataViewTitleAndFields
      | undefined;
  }> => {
    const dynamicDataView = await getDynamicDataView({
      context,
      config,
      logger,
    });
    return { dynamicDataView };
  },
});

export const dataViewRouteRepository = {
  ...staticDataViewRoute,
  ...dynamicDataViewRoute,
};
