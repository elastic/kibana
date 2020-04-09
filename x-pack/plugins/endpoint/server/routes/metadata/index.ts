/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, RequestHandlerContext } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { schema } from '@kbn/config-schema';

import { HostInfo, HostMetadata, HostResultList, HostStatus } from '../../../common/types';
import { EndpointAppContext } from '../../types';
import { getESQueryHostMetadataByID, kibanaRequestToMetadataListESQuery } from './query_builders';

interface HitSource {
  _source: HostMetadata;
}

export function registerEndpointRoutes(router: IRouter, endpointAppContext: EndpointAppContext) {
  router.post(
    {
      path: '/api/endpoint/metadata',
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
        const queryParams = await kibanaRequestToMetadataListESQuery(req, endpointAppContext);
        const response = (await context.core.elasticsearch.dataClient.callAsCurrentUser(
          'search',
          queryParams
        )) as SearchResponse<HostMetadata>;
        return res.ok({ body: mapToHostResultList(queryParams, response) });
      } catch (err) {
        return res.internalError({ body: err });
      }
    }
  );

  router.get(
    {
      path: '/api/endpoint/metadata/{id}',
      validate: {
        params: schema.object({ id: schema.string() }),
      },
      options: { authRequired: true },
    },
    async (context, req, res) => {
      try {
        const doc = await getHostData(context, req.params.id);
        if (doc) {
          return res.ok({ body: doc });
        }
        return res.notFound({ body: 'Endpoint Not Found' });
      } catch (err) {
        return res.internalError({ body: err });
      }
    }
  );
}

export async function getHostData(
  context: RequestHandlerContext,
  id: string
): Promise<HostInfo | undefined> {
  const query = getESQueryHostMetadataByID(id);
  const response = (await context.core.elasticsearch.dataClient.callAsCurrentUser(
    'search',
    query
  )) as SearchResponse<HostMetadata>;

  if (response.hits.hits.length === 0) {
    return undefined;
  }

  return enrichHostMetadata(response.hits.hits[0]._source);
}

function mapToHostResultList(
  queryParams: Record<string, any>,
  searchResponse: SearchResponse<HostMetadata>
): HostResultList {
  const totalNumberOfHosts = searchResponse?.aggregations?.total?.value || 0;
  if (searchResponse.hits.hits.length > 0) {
    return {
      request_page_size: queryParams.size,
      request_page_index: queryParams.from,
      hosts: searchResponse.hits.hits
        .map(response => response.inner_hits.most_recent.hits.hits)
        .flatMap(data => data as HitSource)
        .map(entry => enrichHostMetadata(entry._source)),
      total: totalNumberOfHosts,
    };
  } else {
    return {
      request_page_size: queryParams.size,
      request_page_index: queryParams.from,
      total: totalNumberOfHosts,
      hosts: [],
    };
  }
}

function enrichHostMetadata(hostMetadata: HostMetadata): HostInfo {
  return {
    metadata: hostMetadata,
    host_status: HostStatus.ERROR,
  };
}
