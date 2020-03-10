/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { schema } from '@kbn/config-schema';
import { EndpointMetadata, EndpointResultList } from '../../../common/types';
import { EndpointAppContext } from '../../types';
import { metadataIndexGetBodySchema } from '../../../common/schema/metadata_index';
import {
  kibanaRequestToMetadataListESQuery,
  kibanaRequestToMetadataGetESQuery,
} from './query_builders';

interface HitSource {
  _source: EndpointMetadata;
}

export function registerEndpointRoutes(router: IRouter, endpointAppContext: EndpointAppContext) {
  router.post(
    {
      path: '/api/endpoint/metadata',
      validate: {
        body: metadataIndexGetBodySchema,
      },
      options: { authRequired: true },
    },
    async (context, req, res) => {
      try {
        const queryParams = await kibanaRequestToMetadataListESQuery(req, endpointAppContext);
        const response: SearchResponse<EndpointMetadata> = await context.core.elasticsearch.dataClient.callAsCurrentUser(
          'search',
          queryParams
        );
        return res.ok({ body: mapToEndpointResultList(queryParams, response) });
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
        const query = kibanaRequestToMetadataGetESQuery(req);
        const response: SearchResponse<EndpointMetadata> = await context.core.elasticsearch.dataClient.callAsCurrentUser(
          'search',
          query
        );

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
  queryParams: { size: number; from: number },
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
