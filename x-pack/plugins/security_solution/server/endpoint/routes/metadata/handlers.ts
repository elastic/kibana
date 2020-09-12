/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import Boom from 'boom';
import { RequestHandlerContext, Logger, RequestHandler } from 'kibana/server';
import { TypeOf } from '@kbn/config-schema';
import {
  HostInfo,
  HostMetadata,
  HostMetadataDetails,
  HostResultList,
  HostStatus,
} from '../../../../common/endpoint/types';
import { getESQueryHostMetadataByID, kibanaRequestToMetadataListESQuery } from './query_builders';
import { Agent, AgentStatus } from '../../../../../ingest_manager/common/types/models';
import {
  EndpointAppContext,
  HostListQueryResult,
  MetadataQueryConfig,
  MetadataQueryConfigVersions,
} from '../../types';
import { GetMetadataListRequestSchema, GetMetadataRequestSchema } from './index';
import { findAllUnenrolledAgentIds } from './support/unenroll';
import { findAgentIDsByStatus } from './support/agent_status';
import { EndpointAppContextService } from '../../endpoint_app_context_services';

export interface MetadataRequestContext {
  endpointAppContextService: EndpointAppContextService;
  logger: Logger;
  requestHandlerContext: RequestHandlerContext;
}

const HOST_STATUS_MAPPING = new Map<AgentStatus, HostStatus>([
  ['online', HostStatus.ONLINE],
  ['offline', HostStatus.OFFLINE],
  ['unenrolling', HostStatus.UNENROLLING],
]);

/**
 * 00000000-0000-0000-0000-000000000000 is initial Elastic Agent id sent by Endpoint before policy is configured
 * 11111111-1111-1111-1111-111111111111 is Elastic Agent id sent by Endpoint when policy does not contain an id
 */

const IGNORED_ELASTIC_AGENT_IDS = [
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
];

export const getLogger = (endpointAppContext: EndpointAppContext): Logger => {
  return endpointAppContext.logFactory.get('metadata');
};

export const getMetadataListRequestHandler = function (
  endpointAppContext: EndpointAppContext,
  logger: Logger,
  queryConfigVersion: MetadataQueryConfigVersions
): RequestHandler<undefined, TypeOf<typeof GetMetadataListRequestSchema.body>, undefined> {
  return async (context, request, response) => {
    try {
      const agentService = endpointAppContext.service.getAgentService();
      if (agentService === undefined) {
        throw new Error('agentService not available');
      }

      const metadataRequestContext: MetadataRequestContext = {
        endpointAppContextService: endpointAppContext.service,
        logger,
        requestHandlerContext: context,
      };

      const unenrolledAgentIds = await findAllUnenrolledAgentIds(
        agentService,
        context.core.savedObjects.client
      );

      const statusIDs = request.body?.filters?.host_status?.length
        ? await findAgentIDsByStatus(
            agentService,
            context.core.savedObjects.client,
            request.body?.filters?.host_status
          )
        : undefined;

      const queryConfig: MetadataQueryConfig = endpointAppContext.service
        ?.getMetadataService()
        .queryConfig(queryConfigVersion);

      const queryParams = await kibanaRequestToMetadataListESQuery(
        request,
        endpointAppContext,
        queryConfig,
        {
          unenrolledAgentIds: unenrolledAgentIds.concat(IGNORED_ELASTIC_AGENT_IDS),
          statusAgentIDs: statusIDs,
        }
      );

      const searchResponse = (await context.core.elasticsearch.legacy.client.callAsCurrentUser(
        'search',
        queryParams
      )) as SearchResponse<HostMetadata | HostMetadataDetails>;
      const hostListQueryResult = queryConfig.queryResponseToHostListResult(searchResponse);
      return response.ok({
        body: await mapToHostResultList(queryParams, hostListQueryResult, metadataRequestContext),
      });
    } catch (err) {
      logger.warn(JSON.stringify(err, null, 2));
      return response.internalError({ body: err });
    }
  };
};

export const getMetadataRequestHandler = function (
  endpointAppContext: EndpointAppContext,
  logger: Logger,
  queryConfigVersion: MetadataQueryConfigVersions
): RequestHandler<undefined, TypeOf<typeof GetMetadataRequestSchema.params>, undefined> {
  return async (context, request, response) => {
    const agentService = endpointAppContext.service.getAgentService();
    if (agentService === undefined) {
      return response.internalError({ body: 'agentService not available' });
    }

    const metadataRequestContext: MetadataRequestContext = {
      endpointAppContextService: endpointAppContext.service,
      logger,
      requestHandlerContext: context,
    };

    try {
      const doc = await getHostData(metadataRequestContext, request.params.id, queryConfigVersion);
      if (doc) {
        return response.ok({ body: doc });
      }
      return response.notFound({ body: 'Endpoint Not Found' });
    } catch (err) {
      logger.warn(JSON.stringify(err, null, 2));
      if (err.isBoom) {
        return response.customError({
          statusCode: err.output.statusCode,
          body: { message: err.message },
        });
      }
      return response.internalError({ body: err });
    }
  };
};

export async function getHostData(
  metadataRequestContext: MetadataRequestContext,
  id: string,
  queryConfigVersion: MetadataQueryConfigVersions
): Promise<HostInfo | undefined> {
  const queryConfig: MetadataQueryConfig = metadataRequestContext.endpointAppContextService
    ?.getMetadataService()
    .queryConfig(queryConfigVersion);

  const query = getESQueryHostMetadataByID(id, queryConfig);
  const hostResult = queryConfig.queryResponseToHostResult(
    await metadataRequestContext.requestHandlerContext.core.elasticsearch.legacy.client.callAsCurrentUser(
      'search',
      query
    )
  );

  if (hostResult.resultLength === 0) {
    return undefined;
  }

  const hostMetadata: HostMetadata = hostResult?.result;
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
    return await metadataRequestContext.endpointAppContextService
      .getAgentService()
      .getAgent(
        metadataRequestContext.requestHandlerContext.core.savedObjects.client,
        hostMetadata.elastic.agent.id
      );
  } catch (e) {
    if (
      metadataRequestContext.requestHandlerContext.core.savedObjects.client.errors.isNotFoundError(
        e
      )
    ) {
      metadataRequestContext.logger.warn(
        `agent with id ${hostMetadata.elastic.agent.id} not found`
      );
      return undefined;
    } else {
      throw e;
    }
  }
}

export async function mapToHostResultList(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queryParams: Record<string, any>,
  hostListQueryResult: HostListQueryResult,
  metadataRequestContext: MetadataRequestContext
): Promise<HostResultList> {
  const totalNumberOfHosts = hostListQueryResult.resultLength;
  if (hostListQueryResult.resultList.length > 0) {
    return {
      request_page_size: queryParams.size,
      request_page_index: queryParams.from,
      hosts: await Promise.all(
        hostListQueryResult.resultList.map(async (entry) =>
          enrichHostMetadata(entry, metadataRequestContext)
        )
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

    const status = await metadataRequestContext.endpointAppContextService
      .getAgentService()
      ?.getAgentStatusById(
        metadataRequestContext.requestHandlerContext.core.savedObjects.client,
        elasticAgentId
      );
    hostStatus = HOST_STATUS_MAPPING.get(status) || HostStatus.ERROR;
  } catch (e) {
    if (
      metadataRequestContext.requestHandlerContext.core.savedObjects.client.errors.isNotFoundError(
        e
      )
    ) {
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
