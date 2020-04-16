/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, Logger, RequestHandlerContext } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { schema } from '@kbn/config-schema';

import Boom from 'boom';
import { HostInfo, HostMetadata, HostResultList, HostStatus } from '../../../common/types';
import { EndpointAppContext } from '../../types';
import { getESQueryHostMetadataByID, kibanaRequestToMetadataListESQuery } from './query_builders';
import { Agent, IngestManagerRequestHandlerContext } from '../../../../ingest_manager/common/types';

interface HitSource {
  _source: HostMetadata;
}

interface EnrichmentService {
  logger: Logger;
  getAgent: (agentId: string) => Promise<Agent>;
}

interface MetadataRequestContext {
  requestHandlerContext: RequestHandlerContext;
  endpointAppContext: EndpointAppContext;
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
            requestHandlerContext: context,
            endpointAppContext,
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
  const query = getESQueryHostMetadataByID(id);
  const response = (await metadataRequestContext.requestHandlerContext.core.elasticsearch.dataClient.callAsCurrentUser(
    'search',
    query
  )) as SearchResponse<HostMetadata>;

  if (response.hits.hits.length === 0) {
    return undefined;
  }
  const plugin = getIngestPluginFromContext(metadataRequestContext.requestHandlerContext);
  return enrichHostMetadata(response.hits.hits[0]._source, {
    getAgent: plugin.getAgent,
    logger: metadataRequestContext.endpointAppContext.logFactory.get('metadata'),
  });
}

async function mapToHostResultList(
  queryParams: Record<string, any>,
  searchResponse: SearchResponse<HostMetadata>,
  metadataRequestContext: MetadataRequestContext
): Promise<HostResultList> {
  const totalNumberOfHosts = searchResponse?.aggregations?.total?.value || 0;
  if (searchResponse.hits.hits.length > 0) {
    const plugin = getIngestPluginFromContext(metadataRequestContext.requestHandlerContext);
    return {
      request_page_size: queryParams.size,
      request_page_index: queryParams.from,
      hosts: await Promise.all(
        searchResponse.hits.hits
          .map(response => response.inner_hits.most_recent.hits.hits)
          .flatMap(data => data as HitSource)
          .map(async entry =>
            enrichHostMetadata(entry._source, {
              getAgent: plugin.getAgent,
              logger: metadataRequestContext.endpointAppContext.logFactory.get('metadata'),
            })
          )
      ),
      total: totalNumberOfHosts,
    };
  } else {
    return Promise.resolve({
      request_page_size: queryParams.size,
      request_page_index: queryParams.from,
      total: totalNumberOfHosts,
      hosts: [],
    });
  }
}

async function enrichHostMetadata(
  hostMetadata: HostMetadata,
  enrichmentService: EnrichmentService
): Promise<HostInfo> {
  let hostStatus = HostStatus.ERROR;
  try {
    const agent = await enrichmentService.getAgent(hostMetadata.elastic.agent.id);
    if (agent.status === 'offline') {
      hostStatus = HostStatus.OFFLINE;
    } else if (agent.status === 'online') {
      hostStatus = HostStatus.ONLINE;
    } else {
      hostStatus = HostStatus.ERROR;
    }
  } catch (e) {
    if (e.isBoom && e.output.statusCode === 404) {
      enrichmentService.logger.warn(`agent with id ${hostMetadata.elastic.agent.id} not found`);
    } else {
      throw e;
    }
  }
  return {
    metadata: hostMetadata,
    host_status: hostStatus,
  };
}

function getIngestPluginFromContext(
  requestHandlerContext: RequestHandlerContext
): IngestManagerRequestHandlerContext {
  if (!requestHandlerContext.ingestManagerPlugin) {
    throw Boom.illegal('ingestManagerPlugin is required');
  }
  return requestHandlerContext?.ingestManagerPlugin;
}
