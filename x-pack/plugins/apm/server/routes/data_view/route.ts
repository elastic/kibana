/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { createStaticDataView } from './create_static_data_view';
import { setupRequest } from '../../lib/helpers/setup_request';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getApmDataViewTitle } from './get_apm_data_view_title';
import { getApmIndices } from '../settings/apm_indices/get_apm_indices';

const staticDataViewRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/data_view/static',
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<{ dataView: DataView | undefined }> => {
    const setup = await setupRequest(resources);
    const { context, plugins, request, config } = resources;

    const coreContext = await context.core;
    const dataViewStart = await plugins.dataViews.start();
    const dataViewService = await dataViewStart.dataViewsServiceFactory(
      coreContext.savedObjects.client,
      coreContext.elasticsearch.client.asCurrentUser,
      request,
      true
    );

    const dataView = await createStaticDataView({
      dataViewService,
      config,
      setup,
    });

    return { dataView };
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
