/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { schema } from '@kbn/config-schema';
import { EndpointAppContext, EndpointData } from '../types';
import { AllEndpointsQueryBuilder } from '../services/endpoint/endpoint_query_builders';

interface HitSource {
  _source: EndpointData;
}

export interface EndpointResultList {
  endpoints: EndpointData[];
  total: number;
  requestPageSize: number;
  requestIndex: number;
}

export function registerEndpointRoutes(router: IRouter, endpointAppContext: EndpointAppContext) {
  router.get(
    {
      path: '/api/endpoint/endpoints',
      validate: {
        query: schema.object({
          pageSize: schema.number({ defaultValue: 10 }),
          pageIndex: schema.number({ defaultValue: 0 }),
        }),
      },
      options: { authRequired: true },
    },
    async (context, req, res) => {
      try {
        const queryParams = await new AllEndpointsQueryBuilder(
          req,
          endpointAppContext
        ).toQueryParams();
        const response = (await context.core.elasticsearch.dataClient.callAsCurrentUser(
          'search',
          queryParams
        )) as SearchResponse<EndpointData>;
        return res.ok({ body: await mapToEndpointResultList(queryParams, response) });
      } catch (err) {
        return res.internalError({ body: err });
      }
    }
  );
}

function mapToEndpointResultList(
  queryParams: Record<string, unknown>,
  searchResponse: SearchResponse<EndpointData>
): EndpointResultList {
  if (searchResponse.hits.hits.length > 0) {
    return {
      requestPageSize: queryParams.size as number,
      requestIndex: queryParams.from as number,
      endpoints: searchResponse.hits.hits
        .map(response => response.inner_hits.most_recent.hits.hits)
        .flatMap(data => data as HitSource)
        .map(entry => entry._source),
      total: searchResponse.aggregations.total.value,
    };
  } else {
    return {
      requestPageSize: queryParams.size as number,
      requestIndex: queryParams.from as number,
      total: 0,
      endpoints: [],
    };
  }
}
