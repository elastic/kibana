/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateDataViewResponse,
  createStaticDataView,
} from './create_static_data_view';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getApmDataViewTitle } from './get_apm_data_view_title';
import { getApmIndices } from '../settings/apm_indices/get_apm_indices';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';

const staticDataViewRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/data_view/static',
  options: { tags: ['access:apm'] },
  handler: async (resources): CreateDataViewResponse => {
    const { context, plugins, request } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const coreContext = await context.core;

    const dataViewStart = await plugins.dataViews.start();
    const dataViewService = await dataViewStart.dataViewsServiceFactory(
      coreContext.savedObjects.client,
      coreContext.elasticsearch.client.asCurrentUser,
      request,
      true
    );

    const res = await createStaticDataView({
      dataViewService,
      resources,
      apmEventClient,
    });

    return res;
  },
});

const dataViewTitleRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/data_view/title',
  options: { tags: ['access:apm'] },
  handler: async ({
    context,
    config,
    logger,
  }): Promise<{ apmDataViewTitle: string }> => {
    const coreContext = await context.core;
    const apmIndicies = await getApmIndices({
      savedObjectsClient: coreContext.savedObjects.client,
      config,
    });
    const apmDataViewTitle = getApmDataViewTitle(apmIndicies);

    return { apmDataViewTitle };
  },
});

export const dataViewRouteRepository = {
  ...staticDataViewRoute,
  ...dataViewTitleRoute,
};
