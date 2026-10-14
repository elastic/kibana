/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SpanLinkDetails } from '@kbn/apm-types';
import {
  routeDefinitions,
  type LinkedParentsResponse,
  type LinkedChildrenResponse,
  type SpanLinksResponse,
} from '@kbn/apm-api-shared';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getSpanLinksDetails } from './get_span_links_details';
import { getLinkedChildrenOfSpan } from './get_linked_children';
import { getLinkedParentsOfSpan } from './get_linked_parents';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';

const linkedParentsRoute = createApmServerRoute({
  endpoint: routeDefinitions.spanLinks.linkedParents.endpoint,
  params: routeDefinitions.spanLinks.linkedParents.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<LinkedParentsResponse> => {
    const {
      params: { query, path },
    } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const linkedParents = await getLinkedParentsOfSpan({
      apmEventClient,
      traceId: path.traceId,
      spanId: path.spanId,
      start: query.start,
      end: query.end,
      processorEvent: query.processorEvent,
    });

    return {
      spanLinksDetails: await getSpanLinksDetails({
        apmEventClient,
        spanLinks: linkedParents,
        kuery: query.kuery,
        start: query.start,
        end: query.end,
      }),
    };
  },
});

const linkedChildrenRoute = createApmServerRoute({
  endpoint: routeDefinitions.spanLinks.linkedChildren.endpoint,
  params: routeDefinitions.spanLinks.linkedChildren.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<LinkedChildrenResponse> => {
    const {
      params: { query, path },
    } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const linkedChildren = await getLinkedChildrenOfSpan({
      apmEventClient,
      traceId: path.traceId,
      spanId: path.spanId,
      start: query.start,
      end: query.end,
    });

    return {
      spanLinksDetails: await getSpanLinksDetails({
        apmEventClient,
        spanLinks: linkedChildren,
        kuery: query.kuery,
        start: query.start,
        end: query.end,
      }),
    };
  },
});

const spanLinksRoute = createApmServerRoute({
  endpoint: routeDefinitions.spanLinks.spanLinks.endpoint,
  params: routeDefinitions.spanLinks.spanLinks.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<SpanLinksResponse> => {
    const {
      params: { query, path },
    } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const [outgoingSpanLinks, incomingSpanLinks] = await Promise.all([
      getLinkedParentsOfSpan({
        apmEventClient,
        traceId: path.traceId,
        spanId: path.spanId,
        start: query.start,
        end: query.end,
        processorEvent: query.processorEvent,
      }).then(
        (linkedParents): Promise<SpanLinkDetails[]> =>
          getSpanLinksDetails({
            apmEventClient,
            spanLinks: linkedParents,
            kuery: query.kuery,
            start: query.start,
            end: query.end,
          })
      ),
      getLinkedChildrenOfSpan({
        apmEventClient,
        traceId: path.traceId,
        spanId: path.spanId,
        start: query.start,
        end: query.end,
      }).then(
        (linkedChildren): Promise<SpanLinkDetails[]> =>
          getSpanLinksDetails({
            apmEventClient,
            spanLinks: linkedChildren,
            kuery: query.kuery,
            start: query.start,
            end: query.end,
          })
      ),
    ]);

    return { outgoingSpanLinks, incomingSpanLinks };
  },
});

export const spanLinksRouteRepository = {
  ...linkedParentsRoute,
  ...linkedChildrenRoute,
  ...spanLinksRoute,
};
