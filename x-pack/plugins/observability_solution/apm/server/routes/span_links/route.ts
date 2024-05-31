/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getSpanLinksDetails } from './get_span_links_details';
import { getLinkedChildrenOfSpan } from './get_linked_children';
import { kueryRt, rangeRt } from '../default_api_types';
import { SpanLinkDetails } from '../../../common/span_links';
import { processorEventRt } from '../../../common/processor_event';
import { getLinkedParentsOfSpan } from './get_linked_parents';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';

const linkedParentsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/traces/{traceId}/span_links/{spanId}/parents',
  params: t.type({
    path: t.type({
      traceId: t.string,
      spanId: t.string,
    }),
    query: t.intersection([kueryRt, rangeRt, t.type({ processorEvent: processorEventRt })]),
  }),
  options: { tags: ['access:apm'] },
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
  options: { tags: ['access:apm'] },
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

export const spanLinksRouteRepository = {
  ...linkedParentsRoute,
  ...linkedChildrenRoute,
};
