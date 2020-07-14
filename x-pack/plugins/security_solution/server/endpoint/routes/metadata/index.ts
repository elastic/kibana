/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, Logger, RequestHandlerContext } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { schema } from '@kbn/config-schema';
import Boom from 'boom';

import { metadataIndexPattern } from '../../../../common/endpoint/constants';
import { getESQueryHostMetadataByID, kibanaRequestToMetadataListESQuery } from './query_builders';
import {
  HostInfo,
  HostMetadata,
  HostResultList,
  HostStatus,
} from '../../../../common/endpoint/types';
import { EndpointAppContext } from '../../types';
import { AgentService } from '../../../../../ingest_manager/server';
import { Agent, AgentStatus } from '../../../../../ingest_manager/common/types/models';
import { findAllUnenrolledAgentIds } from './support/unenroll';

interface HitSource {
  _source: HostMetadata;
}

interface MetadataRequestContext {
  agentService: AgentService;
  logger: Logger;
  requestHandlerContext: RequestHandlerContext;
}

const HOST_STATUS_MAPPING = new Map<AgentStatus, HostStatus>([
  ['online', HostStatus.ONLINE],
  ['offline', HostStatus.OFFLINE],
]);

/**
 * 00000000-0000-0000-0000-000000000000 is initial Elastic Agent id sent by Endpoint before policy is configured
 * 11111111-1111-1111-1111-111111111111 is Elastic Agent id sent by Endpoint when policy does not contain an id
 */

const IGNORED_ELASTIC_AGENT_IDS = [
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
];

const getLogger = (endpointAppContext: EndpointAppContext): Logger => {
  return endpointAppContext.logFactory.get('metadata');
};

export function registerEndpointRoutes(router: IRouter, endpointAppContext: EndpointAppContext) {
  const logger = getLogger(endpointAppContext);
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
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    async (context, req, res) => {
      try {
        const agentService = endpointAppContext.service.getAgentService();
        if (agentService === undefined) {
          throw new Error('agentService not available');
        }

        const metadataRequestContext: MetadataRequestContext = {
          agentService,
          logger,
          requestHandlerContext: context,
        };

        const unenrolledAgentIds = await findAllUnenrolledAgentIds(
          agentService,
          context.core.savedObjects.client
        );

        const queryParams = await kibanaRequestToMetadataListESQuery(
          req,
          endpointAppContext,
          metadataIndexPattern,
          {
            unenrolledAgentIds: unenrolledAgentIds.concat(IGNORED_ELASTIC_AGENT_IDS),
          }
        );

        const response = (await context.core.elasticsearch.legacy.client.callAsCurrentUser(
          'search',
          queryParams
        )) as SearchResponse<HostMetadata>;

        return res.ok({
          body: await mapToHostResultList(queryParams, response, metadataRequestContext),
        });
      } catch (err) {
        logger.warn(JSON.stringify(err, null, 2));
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
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    async (context, req, res) => {
      const agentService = endpointAppContext.service.getAgentService();
      if (agentService === undefined) {
        return res.internalError({ body: 'agentService not available' });
      }

      const metadataRequestContext: MetadataRequestContext = {
        agentService,
        logger,
        requestHandlerContext: context,
      };

      try {
        const doc = await getHostData(metadataRequestContext, req.params.id);
        if (doc) {
          return res.ok({ body: doc });
        }
        return res.notFound({ body: 'Endpoint Not Found' });
      } catch (err) {
        logger.warn(JSON.stringify(err, null, 2));
        if (err.isBoom) {
          return res.customError({
            statusCode: err.output.statusCode,
            body: { message: err.message },
          });
        }
        return res.internalError({ body: err });
      }
    }
  );
}

export async function getHostData(
  metadataRequestContext: MetadataRequestContext,
  id: string
): Promise<HostInfo | undefined> {
  const query = getESQueryHostMetadataByID(id, metadataIndexPattern);
  const response = (await metadataRequestContext.requestHandlerContext.core.elasticsearch.legacy.client.callAsCurrentUser(
    'search',
    query
  )) as SearchResponse<HostMetadata>;

  if (response.hits.hits.length === 0) {
    return undefined;
  }

  const hostMetadata: HostMetadata = response.hits.hits[0]._source;
  const agent = await findAgent(metadataRequestContext, hostMetadata);

  if (agent && !agent.active) {
    throw Boom.badRequest('the requested endpoint is unenrolled');
  }

  return enrichHostMetadata(hostMetadata, metadataRequestContext);
}

async function findAgent(
  metadataRequestContext: MetadataRequestContext,
  hostMetadata: HostMetadata
): Promise<Agent | undefined> {
  try {
    return await metadataRequestContext.agentService.getAgent(
      metadataRequestContext.requestHandlerContext.core.savedObjects.client,
      hostMetadata.elastic.agent.id
    );
  } catch (e) {
    if (e.isBoom && e.output.statusCode === 404) {
      metadataRequestContext.logger.warn(
        `agent with id ${hostMetadata.elastic.agent.id} not found`
      );
      return undefined;
    } else {
      throw e;
    }
  }
}

async function mapToHostResultList(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          .map((response) => response.inner_hits.most_recent.hits.hits)
          .flatMap((data) => data as HitSource)
          .map(async (entry) => enrichHostMetadata(entry._source, metadataRequestContext))
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
  const log = metadataRequestContext.logger;
  try {
    /**
     * Get agent status by elastic agent id if available or use the host id.
     */

    if (!elasticAgentId) {
      elasticAgentId = hostMetadata.host.id;
      log.warn(`Missing elastic agent id, using host id instead ${elasticAgentId}`);
    }

    const status = await metadataRequestContext.agentService.getAgentStatusById(
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
