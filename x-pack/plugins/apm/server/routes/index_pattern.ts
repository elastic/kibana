/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createStaticIndexPattern } from '../lib/index_pattern/create_static_index_pattern';
import { createRoute } from './create_route';
import { setupRequest } from '../lib/helpers/setup_request';
import { getInternalSavedObjectsClient } from '../lib/helpers/get_internal_saved_objects_client';
import { getApmIndexPatternTitle } from '../lib/index_pattern/get_apm_index_pattern_title';
import { getDynamicIndexPattern } from '../lib/index_pattern/get_dynamic_index_pattern';
import { getApmIndices } from '../lib/settings/apm_indices/get_apm_indices';
import { UIProcessorEvent } from '../../common/processor_event';
import { withApmSpan } from '../utils/with_apm_span';

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
  params: t.partial({
    query: t.partial({
      processorEvent: t.union([
        t.literal('transaction'),
        t.literal('metric'),
        t.literal('error'),
      ]),
    }),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context }) => {
    const indices = await withApmSpan('get_apm_indices', () =>
      getApmIndices({
        config: context.config,
        savedObjectsClient: context.core.savedObjects.client,
      })
    );

    const processorEvent = context.params.query.processorEvent as
      | UIProcessorEvent
      | undefined;

    const dynamicIndexPattern = await getDynamicIndexPattern({
      context,
      indices,
      processorEvent,
    });

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
