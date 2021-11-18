/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createApmServerRouteRepository } from '../apm_routes/create_apm_server_route_repository';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import {
  getApmIndices,
  getApmIndexSettings,
} from '../../lib/settings/apm_indices/get_apm_indices';
import { saveApmIndices } from '../../lib/settings/apm_indices/save_apm_indices';
import { APMConfig } from '../..';

// get list of apm indices and values
const apmIndexSettingsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/settings/apm-index-settings',
  options: { tags: ['access:apm'] },
  handler: async ({ config, context }) => {
    const apmIndexSettings = await getApmIndexSettings({ config, context });
    return { apmIndexSettings };
  },
});

// get apm indices configuration object
const apmIndicesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/settings/apm-indices',
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const { context, config } = resources;
    return await getApmIndices({
      savedObjectsClient: context.core.savedObjects.client,
      config,
    });
  },
});

type SaveApmIndicesBodySchema = {
  [Property in keyof APMConfig['indices']]: t.StringC;
};

// save ui indices
const saveApmIndicesRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/settings/apm-indices/save',
  options: {
    tags: ['access:apm', 'access:apm_write'],
  },
  params: t.type({
    body: t.partial({
      sourcemap: t.string,
      error: t.string,
      onboarding: t.string,
      span: t.string,
      transaction: t.string,
      metric: t.string,
    } as SaveApmIndicesBodySchema),
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
