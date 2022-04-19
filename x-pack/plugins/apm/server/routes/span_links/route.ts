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
import { getSpanLinks } from './get_span_links';

const spanLinksRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/span_links',
  params: t.type({
    query: t.type({
      spanLinks: jsonRt.pipe(
        t.array(
          t.type({
            trace: t.type({ id: t.string }),
            span: t.type({ id: t.string }),
          })
        )
      ),
    }),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    spanLinks: Array<
      import('../../../common/span_links/span_links_types').SpanLink
    >;
  }> => {
    const { params } = resources;
    const setup = await setupRequest(resources);
    return {
      spanLinks: await getSpanLinks({ setup }),
    };
  },
});

export const spanLinksRouteRepository = {
  ...spanLinksRoute,
};
