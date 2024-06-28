/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getEventMetadata } from './get_event_metadata';
import { processorEventRt } from '../../../common/processor_event';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { rangeRt } from '../default_api_types';

const eventMetadataRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/event_metadata/{processorEvent}/{id}',
  options: { tags: ['access:apm'] },
  params: t.type({
    path: t.type({
      processorEvent: processorEventRt,
      id: t.string,
    }),
    query: rangeRt,
  }),
  handler: async (resources): Promise<{ metadata: Partial<Record<string, unknown[]>> }> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { start, end } = params.query;
    const { processorEvent, id } = params.path;

    const metadata = await getEventMetadata({
      apmEventClient,
      processorEvent,
      id,
      start,
      end,
    });

    return {
      metadata,
    };
  },
});

export const eventMetadataRouteRepository = eventMetadataRoute;
