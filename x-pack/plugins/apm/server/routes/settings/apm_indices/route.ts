/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createApmServerRoute } from '../../apm_routes/create_apm_server_route';
import { getApmIndices, getApmIndexSettings } from './get_apm_indices';
import { saveApmIndices } from './save_apm_indices';
import { APMConfig } from '../../..';

// get list of apm indices and values
const apmIndexSettingsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/settings/apm-index-settings',
  options: { tags: ['access:apm'] },
  handler: async ({
    config,
    context,
  }): Promise<{
    apmIndexSettings: Array<{
      configurationName:
        | 'transaction'
        | 'span'
        | 'error'
        | 'metric'
        | 'sourcemap'
        | 'onboarding';
      defaultValue: string;
      savedValue: string | undefined;
    }>;
  }> => {
    const apmIndexSettings = await getApmIndexSettings({ config, context });
    return { apmIndexSettings };
  },
});

// get apm indices configuration object
const apmIndicesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/settings/apm-indices',
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<
    import('./../../../../../observability/common/typings').ApmIndicesConfig
  > => {
    const { context, config } = resources;
    const savedObjectsClient = (await context.core).savedObjects.client;
    return await getApmIndices({
      savedObjectsClient,
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
  handler: async (
    resources
  ): Promise<
    import('./../../../../../../../src/core/types/saved_objects').SavedObject<{}>
  > => {
    const { params, context } = resources;
    const { body } = params;
    const savedObjectsClient = (await context.core).savedObjects.client;
    return await saveApmIndices(savedObjectsClient, body);
  },
});

export const apmIndicesRouteRepository = {
  ...apmIndexSettingsRoute,
  ...apmIndicesRoute,
  ...saveApmIndicesRoute,
};
