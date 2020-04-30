/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, Logger, RequestHandlerContext } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { schema } from '@kbn/config-schema';

import { getESQueryHostMetadataByID, kibanaRequestToMetadataListESQuery } from './query_builders';
import { HostInfo, HostMetadata, HostResultList, HostStatus } from '../../../common/types';
import { EndpointAppContext } from '../../types';
import { AgentStatus } from '../../../../ingest_manager/common/types/models';

interface HitSource {
  _source: HostMetadata;
}

interface MetadataRequestContext {
  requestHandlerContext: RequestHandlerContext;
  endpointAppContext: EndpointAppContext;
}

const HOST_STATUS_MAPPING = new Map<AgentStatus, HostStatus>([
  ['online', HostStatus.ONLINE],
  ['offline', HostStatus.OFFLINE],
]);

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
        const index = await endpointAppContext.service
          .getIndexPatternRetriever()
          .getMetadataIndexPattern(context);
        const queryParams = await kibanaRequestToMetadataListESQuery(
          req,
          endpointAppContext,
          index
        );
        const response = (await context.core.elasticsearch.dataClient.callAsCurrentUser(
          'search',
          queryParams
        )) as SearchResponse<HostMetadata>;
        return res.ok({
          body: await mapToHostResultList(queryParams, response, {
            endpointAppContext,
            requestHandlerContext: context,
          }),
        });
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
        const doc = await getHostData(
          {
            endpointAppContext,
            requestHandlerContext: context,
          },
          req.params.id
        );
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
  metadataRequestContext: MetadataRequestContext,
  id: string
): Promise<HostInfo | undefined> {
  const index = await metadataRequestContext.endpointAppContext.service
    .getIndexPatternRetriever()
    .getMetadataIndexPattern(metadataRequestContext.requestHandlerContext);
  const query = getESQueryHostMetadataByID(id, index);
  const response = (await metadataRequestContext.requestHandlerContext.core.elasticsearch.dataClient.callAsCurrentUser(
    'search',
    query
  )) as SearchResponse<HostMetadata>;

  if (response.hits.hits.length === 0) {
    return undefined;
  }

  return await enrichHostMetadata(response.hits.hits[0]._source, metadataRequestContext);
}

async function mapToHostResultList(
  queryParams: Record<string, any>,
  searchResponse: SearchResponse<HostMetadata>,
  metadataRequestContext: MetadataRequestContext
): Promise<HostResultList> {
  const totalNumberOfHosts = searchResponse?.aggregations?.total?.value || 0;
  if (searchResponse.hits.hits.length > 0) {
    return {
      request_page_size: queryParams.size,
      request_page_index: queryParams.from,
      hosts: await Promise.all(
        searchResponse.hits.hits
          .map(response => response.inner_hits.most_recent.hits.hits)
          .flatMap(data => data as HitSource)
          .map(async entry => enrichHostMetadata(entry._source, metadataRequestContext))
      ),
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

async function enrichHostMetadata(
  hostMetadata: HostMetadata,
  metadataRequestContext: MetadataRequestContext
): Promise<HostInfo> {
  let hostStatus = HostStatus.ERROR;
  let elasticAgentId = hostMetadata?.elastic?.agent?.id;
  const log = logger(metadataRequestContext.endpointAppContext);
  try {
    /**
     * Get agent status by elastic agent id if available or use the host id.
     */

    if (!elasticAgentId) {
      elasticAgentId = hostMetadata.host.id;
      log.warn(`Missing elastic agent id, using host id instead ${elasticAgentId}`);
    }

    const status = await metadataRequestContext.endpointAppContext.service
      .getAgentService()
      .getAgentStatusById(
        metadataRequestContext.requestHandlerContext.core.savedObjects.client,
        elasticAgentId
      );
    hostStatus = HOST_STATUS_MAPPING.get(status) || HostStatus.ERROR;
  } catch (e) {
    if (e.isBoom && e.output.statusCode === 404) {
      log.warn(`agent with id ${elasticAgentId} not found`);
    } else {
      log.error(e);
      throw e;
    }
  }
  return {
    metadata: hostMetadata,
    host_status: hostStatus,
  };
}

const logger = (endpointAppContext: EndpointAppContext): Logger => {
  return endpointAppContext.logFactory.get('metadata');
};
