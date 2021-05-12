/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createApmServerRouteRepository } from '../create_apm_server_route_repository';
import { createApmServerRoute } from '../create_apm_server_route';
import {
  getApmIndices,
  getApmIndexSettings,
} from '../../lib/settings/apm_indices/get_apm_indices';
import { saveApmIndices } from '../../lib/settings/apm_indices/save_apm_indices';

// get list of apm indices and values
const apmIndexSettingsRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/settings/apm-index-settings',
  options: { tags: ['access:apm'] },
  handler: async ({ config, context }) => {
    const apmIndexSettings = await getApmIndexSettings({ config, context });
    return { apmIndexSettings };
  },
});

// get apm indices configuration object
const apmIndicesRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/settings/apm-indices',
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const { context, config } = resources;
    return await getApmIndices({
      savedObjectsClient: context.core.savedObjects.client,
      config,
    });
  },
});

// save ui indices
const saveApmIndicesRoute = createApmServerRoute({
  endpoint: 'POST /api/apm/settings/apm-indices/save',
  options: {
    tags: ['access:apm', 'access:apm_write'],
  },
  params: t.type({
    body: t.partial({
      /* eslint-disable @typescript-eslint/naming-convention */
      'apm_oss.sourcemapIndices': t.string,
      'apm_oss.errorIndices': t.string,
      'apm_oss.onboardingIndices': t.string,
      'apm_oss.spanIndices': t.string,
      'apm_oss.transactionIndices': t.string,
      'apm_oss.metricsIndices': t.string,
      /* eslint-enable @typescript-eslint/naming-convention */
    }),
  }),
  handler: async (resources) => {
    const { params, context } = resources;
    const { body } = params;
    const savedObjectsClient = context.core.savedObjects.client;
    return await saveApmIndices(savedObjectsClient, body);
  },
});

export const apmIndicesRouteRepository = createApmServerRouteRepository()
  .add(apmIndexSettingsRoute)
  .add(apmIndicesRoute)
  .add(saveApmIndicesRoute);
