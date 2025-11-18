/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import type { SpanLinkDetails } from '@kbn/apm-types';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getSpanLinksDetails } from './get_span_links_details';
import { getLinkedChildrenOfSpan } from './get_linked_children';
import { kueryRt, rangeRt } from '../default_api_types';
import { getLinkedParentsOfSpan } from './get_linked_parents';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { processorEventRt } from '../../../common/processor_event';

const linkedParentsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/traces/{traceId}/span_links/{spanId}/parents',
  params: t.type({
    path: t.type({
      traceId: t.string,
      spanId: t.string,
    }),
    query: t.intersection([kueryRt, rangeRt, t.type({ processorEvent: processorEventRt })]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (
    resources
  ): Promise<{
    spanLinksDetails: SpanLinkDetails[];
  }> => {
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
  endpoint: 'GET /internal/apm/traces/{traceId}/span_links/{spanId}/children',
  params: t.type({
    path: t.type({
      traceId: t.string,
      spanId: t.string,
    }),
    query: t.intersection([kueryRt, rangeRt]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (
    resources
  ): Promise<{
    spanLinksDetails: SpanLinkDetails[];
  }> => {
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
  endpoint: 'GET /internal/apm/traces/{traceId}/span_links/{spanId}',
  params: t.type({
    path: t.type({
      traceId: t.string,
      spanId: t.string,
    }),
    query: t.intersection([kueryRt, rangeRt, t.partial({ processorEvent: processorEventRt })]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (
    resources
  ): Promise<{
    outgoingSpanLinks: SpanLinkDetails[];
    incomingSpanLinks: SpanLinkDetails[];
  }> => {
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
