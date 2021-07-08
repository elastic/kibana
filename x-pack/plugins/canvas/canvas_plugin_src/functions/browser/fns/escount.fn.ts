/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-expect-error untyped local
import { buildESRequest } from '../../../../common/lib/request/build_es_request';
import { searchService } from '../../../../public/services';

import { escount } from '../escount';

export const escountFn: ReturnType<typeof escount>['fn'] = async (input, args, _context) => {
  input.and = input.and.concat([
    {
      type: 'filter',
      filterType: 'luceneQueryString',
      query: args.query,
      and: [],
    },
  ]);

  const esRequest = buildESRequest(
    {
      index: args.index,
      body: {
        track_total_hits: true,
        size: 0,
        query: {
          bool: {
            must: [{ match_all: {} }],
          },
        },
      },
    },
    input
  );

  const search = searchService.getService().search;
  const req = {
    params: {
      ...esRequest,
    },
  };

  const resp = await search.search(req).toPromise();
  return resp.rawResponse.hits.total;
};
