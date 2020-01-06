/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { schema } from '@kbn/config-schema';
import { EndpointAppContext, EndpointData } from '../types';
import { kibanaRequestToEndpointListQuery } from '../services/endpoint/endpoint_query_builders';
import { RouteSchemas } from '../../../../../build/kibana/src/core/server/http/router/route';

interface HitSource {
  _source: EndpointData;
}

export interface EndpointResultList {
  // the endpoint restricted by the page size
  endpoints: EndpointData[];
  // the total number of unique endpoints in the index
  total: number;
  // the page size requested
  requestPageSize: number;
  // the index requested
  requestIndex: number;
}

const endpointListRequestSchema: RouteSchemas<any, any, any> = {
  body: schema.nullable(
    schema.object({
      pagingProperties: schema.arrayOf(
        schema.oneOf([
          // the number of results to return for this request per page
          schema.object({
            pageSize: schema.number({ defaultValue: 10, min: 1, max: 10000 }),
          }),
          // the index of the page to return
          schema.object({ pageIndex: schema.number({ defaultValue: 0, min: 0 }) }),
        ])
      ),
    })
  ),
};

export function registerEndpointRoutes(router: IRouter, endpointAppContext: EndpointAppContext) {
  router.post(
    {
      path: '/api/endpoint/endpoints',
      validate: endpointListRequestSchema,
      options: { authRequired: true },
    },
    async (context, req, res) => {
      try {
        const queryParams = await kibanaRequestToEndpointListQuery(req, endpointAppContext);
        const response = (await context.core.elasticsearch.dataClient.callAsCurrentUser(
          'search',
          queryParams
        )) as SearchResponse<EndpointData>;
        return res.ok({ body: mapToEndpointResultList(queryParams, response) });
      } catch (err) {
        return res.internalError({ body: err });
      }
    }
  );
}

function mapToEndpointResultList(
  queryParams: Record<string, any>,
  searchResponse: SearchResponse<EndpointData>
): EndpointResultList {
  if (searchResponse.hits.hits.length > 0) {
    return {
      requestPageSize: queryParams.size,
      requestIndex: queryParams.from,
      endpoints: searchResponse.hits.hits
        .map(response => response.inner_hits.most_recent.hits.hits)
        .flatMap(data => data as HitSource)
        .map(entry => entry._source),
      total: searchResponse.aggregations.total.value,
    };
  } else {
    return {
      requestPageSize: queryParams.size,
      requestIndex: queryParams.from,
      total: 0,
      endpoints: [],
    };
  }
}
