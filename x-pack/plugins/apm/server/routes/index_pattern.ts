/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStaticIndexPattern } from '../lib/index_pattern/create_static_index_pattern';
import { createRoute } from './create_route';
import { setupRequest } from '../lib/helpers/setup_request';
import { getInternalSavedObjectsClient } from '../lib/helpers/get_internal_saved_objects_client';
import { getApmIndexPatternTitle } from '../lib/index_pattern/get_apm_index_pattern_title';
import { getDynamicIndexPattern } from '../lib/index_pattern/get_dynamic_index_pattern';

export const staticIndexPatternRoute = createRoute((core) => ({
  endpoint: 'POST /api/apm/index_pattern/static',
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const [setup, savedObjectsClient] = await Promise.all([
      setupRequest(context, request),
      getInternalSavedObjectsClient(core),
    ]);

    await createStaticIndexPattern(setup, context, savedObjectsClient);

    // send empty response regardless of outcome
    return undefined;
  },
}));

export const dynamicIndexPatternRoute = createRoute({
  endpoint: 'GET /api/apm/index_pattern/dynamic',
  options: { tags: ['access:apm'] },
  handler: async ({ context }) => {
    const dynamicIndexPattern = await getDynamicIndexPattern({ context });
    return { dynamicIndexPattern };
  },
});

export const apmIndexPatternTitleRoute = createRoute({
  endpoint: 'GET /api/apm/index_pattern/title',
  options: { tags: ['access:apm'] },
  handler: async ({ context }) => {
    return getApmIndexPatternTitle(context);
  },
});
