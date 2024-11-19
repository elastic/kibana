/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { CreateDataViewResponse, createOrUpdateStaticDataView } from './create_static_data_view';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getApmDataViewIndexPattern } from './get_apm_data_view_index_pattern';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';

const staticDataViewRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/data_view/static',
  options: { tags: ['access:apm'] },
  handler: async (resources): CreateDataViewResponse => {
    const { context, plugins, request, logger } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const coreContext = await context.core;

    // get name of selected (name)space
    const spacesStart = await plugins.spaces?.start();
    const spaceId = spacesStart?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;

    if (!spaceId) {
      throw new Error('No spaceId found');
    }

    const dataViewStart = await plugins.dataViews.start();
    const dataViewService = await dataViewStart.dataViewsServiceFactory(
      coreContext.savedObjects.client,
      coreContext.elasticsearch.client.asCurrentUser,
      request,
      true
    );

    const res = await createOrUpdateStaticDataView({
      dataViewService,
      resources,
      apmEventClient,
      spaceId,
      logger,
    });

    return res;
  },
});

const dataViewTitleRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/data_view/index_pattern',
  options: { tags: ['access:apm'] },
  handler: async ({ getApmIndices }): Promise<{ apmDataViewIndexPattern: string }> => {
    const apmIndicies = await getApmIndices();
    const apmDataViewIndexPattern = getApmDataViewIndexPattern(apmIndicies);

    return { apmDataViewIndexPattern };
  },
});

export const dataViewRouteRepository = {
  ...staticDataViewRoute,
  ...dataViewTitleRoute,
};
