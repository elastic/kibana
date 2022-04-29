/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { setupRequest } from '../../lib/helpers/setup_request';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getSpanLinksDetails } from './get_span_links_details';
import { getIncomingSpanLinks } from './get_incoming_span_links';
import { kueryRt, rangeRt } from '../default_api_types';
import { getOutgoingSpanLinks } from './get_outgoing_span_links';
import { SpanLinkDetails } from '../../../common/span_links';

const incomingSpanLinksRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/span_links/incoming',
  params: t.type({
    query: t.intersection([
      kueryRt,
      t.type({ traceId: t.string, spanId: t.string }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    spanLinksDetails: SpanLinkDetails[];
  }> => {
    const {
      params: { query },
    } = resources;
    const setup = await setupRequest(resources);
    const incomingSpanLinks = await getIncomingSpanLinks({
      setup,
      traceId: query.traceId,
      spanId: query.spanId,
    });

    if (!incomingSpanLinks.length) {
      return { spanLinksDetails: [] };
    }

    return {
      spanLinksDetails: await getSpanLinksDetails({
        setup,
        spanLinks: incomingSpanLinks,
        kuery: query.kuery,
      }),
    };
  },
});

const outgoingSpanLinksRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/span_links/outgoing',
  params: t.type({
    query: t.intersection([
      kueryRt,
      rangeRt,
      t.type({ traceId: t.string, spanId: t.string }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    spanLinksDetails: SpanLinkDetails[];
  }> => {
    const {
      params: { query },
    } = resources;
    const setup = await setupRequest(resources);
    const ougoingSpanLinks = await getOutgoingSpanLinks({
      setup,
      traceId: query.traceId,
      spanId: query.spanId,
      start: query.start,
      end: query.end,
    });

    if (!ougoingSpanLinks.length) {
      return { spanLinksDetails: [] };
    }

    return {
      spanLinksDetails: await getSpanLinksDetails({
        setup,
        spanLinks: ougoingSpanLinks,
        kuery: query.kuery,
      }),
    };
  },
});

export const spanLinksRouteRepository = {
  ...incomingSpanLinksRoute,
  ...outgoingSpanLinksRoute,
};
