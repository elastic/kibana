/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { Integration, IntegrationDashboards } from '../../../common/api_types';
import { typeRt } from '../../types/default_api_types';
import { createDatasetQualityServerRoute } from '../create_datasets_quality_server_route';
import { getIntegrations } from './get_integrations';
import { getIntegrationDashboards } from './get_integration_dashboards';

const integrationsRoute = createDatasetQualityServerRoute({
  endpoint: 'GET /internal/dataset_quality/integrations',
  params: t.type({
    query: typeRt,
  }),
  options: {
    tags: [],
  },
  async handler(resources): Promise<{
    integrations: Integration[];
  }> {
    const { params, plugins } = resources;

    const fleetPluginStart = await plugins.fleet.start();
    const packageClient = fleetPluginStart.packageService.asInternalUser;

    const integrations = await getIntegrations({ packageClient, ...params.query });

    return { integrations };
  },
});

const integrationDashboardsRoute = createDatasetQualityServerRoute({
  endpoint: 'GET /internal/dataset_quality/integrations/{integration}/dashboards',
  params: t.type({
    path: t.type({
      integration: t.string,
    }),
  }),
  options: {
    tags: [],
  },
  async handler(resources): Promise<IntegrationDashboards> {
    const { context, params, plugins } = resources;
    const { integration } = params.path;
    const { savedObjects } = await context.core;

    const fleetPluginStart = await plugins.fleet.start();
    const packageClient = fleetPluginStart.packageService.asInternalUser;

    const integrationDashboards = await getIntegrationDashboards(
      packageClient,
      savedObjects.client,
      integration
    );

    return {
      dashboards: integrationDashboards,
    };
  },
});

export const integrationsRouteRepository = {
  ...integrationsRoute,
  ...integrationDashboardsRoute,
};
