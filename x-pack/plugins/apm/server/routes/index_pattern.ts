/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { createStaticIndexPattern } from '../lib/index_pattern/create_static_index_pattern';
import { createRoute } from './create_route';
import { setupRequest } from '../lib/helpers/setup_request';
import { getInternalSavedObjectsClient } from '../lib/helpers/get_internal_saved_objects_client';
import { getApmIndexPatternTitle } from '../lib/index_pattern/get_apm_index_pattern_title';
import { getDynamicIndexPattern } from '../lib/index_pattern/get_dynamic_index_pattern';
import { getApmIndices } from '../lib/settings/apm_indices/get_apm_indices';

export const staticIndexPatternRoute = createRoute((core) => ({
  method: 'POST',
  path: '/api/apm/index_pattern/static',
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const savedObjectsClient = await getInternalSavedObjectsClient(core);
    await createStaticIndexPattern(setup, context, savedObjectsClient);

    // send empty response regardless of outcome
    return undefined;
  },
}));

export const dynamicIndexPatternRoute = createRoute(() => ({
  path: '/api/apm/index_pattern/dynamic',
  params: {
    query: t.partial({
      processorEvent: t.union([
        t.literal('transaction'),
        t.literal('metric'),
        t.literal('error'),
      ]),
    }),
  },
  handler: async ({ context }) => {
    const indices = await getApmIndices({
      config: context.config,
      savedObjectsClient: context.core.savedObjects.client,
    });

    const dynamicIndexPattern = await getDynamicIndexPattern({
      context,
      indices,
    });

    return { dynamicIndexPattern };
  },
}));

export const apmIndexPatternTitleRoute = createRoute(() => ({
  path: '/api/apm/index_pattern/title',
  handler: async ({ context }) => {
    return getApmIndexPatternTitle(context);
  },
}));
