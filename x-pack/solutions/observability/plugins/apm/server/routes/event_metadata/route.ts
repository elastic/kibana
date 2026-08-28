/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { routeDefinitions, type EventMetadataResponse } from '@kbn/apm-api-shared';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getEventMetadata } from './get_event_metadata';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';

const eventMetadataRoute = createApmServerRoute({
  endpoint: routeDefinitions.eventMetadata.eventMetadata.endpoint,
  params: routeDefinitions.eventMetadata.eventMetadata.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<EventMetadataResponse> => {
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
