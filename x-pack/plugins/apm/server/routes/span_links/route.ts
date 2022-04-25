/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { jsonRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import { setupRequest } from '../../lib/helpers/setup_request';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getSpanLinksDetails, SpanLinkDetails } from './get_span_links_details';
import { kueryRt } from '../default_api_types';

const spanLinksRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/span_links/details',
  params: t.type({
    query: t.intersection([
      kueryRt,
      t.type({
        spanLinks: jsonRt.pipe(
          t.array(
            t.type({
              trace: t.type({ id: t.string }),
              span: t.type({ id: t.string }),
            })
          )
        ),
      }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    spanLinksDetails: SpanLinkDetails[];
  }> => {
    const { params } = resources;
    const setup = await setupRequest(resources);
    return {
      spanLinksDetails: await getSpanLinksDetails({
        setup,
        spanLinks: params.query.spanLinks,
        kuery: params.query.kuery,
      }),
    };
  },
});

export const spanLinksRouteRepository = {
  ...spanLinksRoute,
};
