/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { schema } from '@kbn/config-schema';

import {
  kibanaRequestToEndpointListQuery,
  kibanaRequestToEndpointFetchQuery,
} from '../services/endpoint/endpoint_query_builders';
import { EndpointMetadata, EndpointResultList } from '../../common/types';
import { EndpointAppContext } from '../types';

interface HitSource {
  _source: EndpointMetadata;
}

export function registerEndpointRoutes(router: IRouter, endpointAppContext: EndpointAppContext) {
  router.post(
    {
      path: '/api/endpoint/endpoints',
      validate: {
        body: schema.nullable(
          schema.object({
            paging_properties: schema.nullable(
              schema.arrayOf(
                schema.oneOf([
                  /**
                   * the number of results to return for this request per page
                   */
                  schema.object({
                    page_size: schema.number({ defaultValue: 10, min: 1, max: 10000 }),
                  }),
                  /**
                   * the zero based page index of the the total number of pages of page size
                   */
                  schema.object({ page_index: schema.number({ defaultValue: 0, min: 0 }) }),
                ])
              )
            ),
            /**
             * filter to be applied, it could be a kql expression or discrete filter to be implemented
             */
            filter: schema.nullable(schema.oneOf([schema.string()])),
          })
        ),
      },
      options: { authRequired: true },
    },
    async (context, req, res) => {
      try {
        const queryParams = await kibanaRequestToEndpointListQuery(req, endpointAppContext);
        const response = (await context.core.elasticsearch.dataClient.callAsCurrentUser(
          'search',
          queryParams
        )) as SearchResponse<EndpointMetadata>;
        return res.ok({ body: mapToEndpointResultList(queryParams, response) });
      } catch (err) {
        return res.internalError({ body: err });
      }
    }
  );

  router.get(
    {
      path: '/api/endpoint/endpoints/{id}',
      validate: {
        params: schema.object({ id: schema.string() }),
      },
      options: { authRequired: true },
    },
    async (context, req, res) => {
      try {
        const query = kibanaRequestToEndpointFetchQuery(req, endpointAppContext);
        const response = (await context.core.elasticsearch.dataClient.callAsCurrentUser(
          'search',
          query
        )) as SearchResponse<EndpointMetadata>;

        if (response.hits.hits.length === 0) {
          return res.notFound({ body: 'Endpoint Not Found' });
        }

        return res.ok({ body: response.hits.hits[0]._source });
      } catch (err) {
        return res.internalError({ body: err });
      }
    }
  );
}

function mapToEndpointResultList(
  queryParams: Record<string, any>,
  searchResponse: SearchResponse<EndpointMetadata>
): EndpointResultList {
  const totalNumberOfEndpoints = searchResponse?.aggregations?.total?.value || 0;
  if (searchResponse.hits.hits.length > 0) {
    return {
      request_page_size: queryParams.size,
      request_page_index: queryParams.from,
      endpoints: searchResponse.hits.hits
        .map(response => response.inner_hits.most_recent.hits.hits)
        .flatMap(data => data as HitSource)
        .map(entry => entry._source),
      total: totalNumberOfEndpoints,
    };
  } else {
    return {
      request_page_size: queryParams.size,
      request_page_index: queryParams.from,
      total: totalNumberOfEndpoints,
      endpoints: [],
    };
  }
}
