/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { RequestHandlerContext, Logger, RequestHandler } from 'kibana/server';
import { TypeOf } from '@kbn/config-schema';
import {
  HostInfo,
  HostMetadata,
  HostResultList,
  HostStatus,
  MetadataQueryStrategyVersions,
} from '../../../../common/endpoint/types';
import { getESQueryHostMetadataByID, kibanaRequestToMetadataListESQuery } from './query_builders';
import { Agent, AgentStatus } from '../../../../../fleet/common/types/models';
import { EndpointAppContext, HostListQueryResult } from '../../types';
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
  queryStrategyVersion?: MetadataQueryStrategyVersions
): RequestHandler<undefined, undefined, TypeOf<typeof GetMetadataListRequestSchema.body>> {
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

      const statusIDs = request?.body?.filters?.host_status?.length
        ? await findAgentIDsByStatus(
            agentService,
            context.core.savedObjects.client,
            request.body?.filters?.host_status
          )
        : undefined;

      const queryStrategy = await endpointAppContext.service
        ?.getMetadataService()
        ?.queryStrategy(context.core.savedObjects.client, queryStrategyVersion);

      const queryParams = await kibanaRequestToMetadataListESQuery(
        request,
        endpointAppContext,
        queryStrategy!,
        {
          unenrolledAgentIds: unenrolledAgentIds.concat(IGNORED_ELASTIC_AGENT_IDS),
          statusAgentIDs: statusIDs,
        }
      );

      const hostListQueryResult = queryStrategy!.queryResponseToHostListResult(
        await context.core.elasticsearch.legacy.client.callAsCurrentUser('search', queryParams)
      );
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
  queryStrategyVersion?: MetadataQueryStrategyVersions
): RequestHandler<TypeOf<typeof GetMetadataRequestSchema.params>, undefined, undefined> {
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
      const doc = await getHostData(
        metadataRequestContext,
        request?.params?.id,
        queryStrategyVersion
      );
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
  queryStrategyVersion?: MetadataQueryStrategyVersions
): Promise<HostInfo | undefined> {
  const queryStrategy = await metadataRequestContext.endpointAppContextService
    ?.getMetadataService()
    ?.queryStrategy(
      metadataRequestContext.requestHandlerContext.core.savedObjects.client,
      queryStrategyVersion
    );

  const query = getESQueryHostMetadataByID(id, queryStrategy!);
  const hostResult = queryStrategy!.queryResponseToHostResult(
    await metadataRequestContext.requestHandlerContext.core.elasticsearch.legacy.client.callAsCurrentUser(
      'search',
      query
    )
  );
  const hostMetadata = hostResult.result;
  if (!hostMetadata) {
    return undefined;
  }

  const agent = await findAgent(metadataRequestContext, hostMetadata);

  if (agent && !agent.active) {
    throw Boom.badRequest('the requested endpoint is unenrolled');
  }

  const metadata = await enrichHostMetadata(
    hostMetadata,
    metadataRequestContext,
    hostResult.queryStrategyVersion
  );
  return { ...metadata, query_strategy_version: hostResult.queryStrategyVersion };
}

async function findAgent(
  metadataRequestContext: MetadataRequestContext,
  hostMetadata: HostMetadata
): Promise<Agent | undefined> {
  try {
    return await metadataRequestContext.endpointAppContextService
      ?.getAgentService()
      ?.getAgent(
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
          enrichHostMetadata(
            entry,
            metadataRequestContext,
            hostListQueryResult.queryStrategyVersion
          )
        )
      ),
      total: totalNumberOfHosts,
      query_strategy_version: hostListQueryResult.queryStrategyVersion,
    };
  } else {
    return {
      request_page_size: queryParams.size,
      request_page_index: queryParams.from,
      total: totalNumberOfHosts,
      hosts: [],
      query_strategy_version: hostListQueryResult.queryStrategyVersion,
    };
  }
}

async function enrichHostMetadata(
  hostMetadata: HostMetadata,
  metadataRequestContext: MetadataRequestContext,
  metadataQueryStrategyVersion: MetadataQueryStrategyVersions
): Promise<HostInfo> {
  let hostStatus = HostStatus.ERROR;
  let elasticAgentId = hostMetadata?.elastic?.agent?.id;
  const log = metadataRequestContext.logger;
  try {
    /**
     * Get agent status by elastic agent id if available or use the endpoint-agent id.
     */

    if (!elasticAgentId) {
      elasticAgentId = hostMetadata.agent.id;
      log.warn(`Missing elastic agent id, using host id instead ${elasticAgentId}`);
    }

    const status = await metadataRequestContext.endpointAppContextService
      ?.getAgentService()
      ?.getAgentStatusById(
        metadataRequestContext.requestHandlerContext.core.savedObjects.client,
        elasticAgentId
      );
    hostStatus = HOST_STATUS_MAPPING.get(status!) || HostStatus.ERROR;
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

  let policyVersions: HostInfo['policy_versions'] = {
    agent: {
      applied: 0,
      configured: 0,
    },
    endpoint: 0,
  };
  try {
    const [agent, endpointPolicy] = await Promise.all([
      metadataRequestContext.endpointAppContextService
        ?.getAgentService()
        ?.getAgent(
          metadataRequestContext.requestHandlerContext.core.savedObjects.client,
          elasticAgentId
        ),
      metadataRequestContext.endpointAppContextService
        .getPackagePolicyService()
        ?.get(
          metadataRequestContext.requestHandlerContext.core.savedObjects.client,
          hostMetadata.Endpoint.policy.applied.id
        ),
    ]);
    const agentPolicy = await metadataRequestContext.endpointAppContextService
      .getAgentPolicyService()
      ?.get(
        metadataRequestContext.requestHandlerContext.core.savedObjects.client,
        agent?.policy_id!
      );
    policyVersions = {
      agent: {
        applied: agent?.policy_revision || 0,
        configured: agentPolicy?.revision || 0,
      },
      endpoint: endpointPolicy?.revision || 0,
    };
  } catch (e) {
    // this is a non-vital enrichment of expected policy revisions.
    // if we fail just fetching these, the rest of the endpoint
    // data should still be returned. log the error and move on
    log.error(e);
  }

  return {
    metadata: hostMetadata,
    host_status: hostStatus,
    policy_versions: policyVersions,
    query_strategy_version: metadataQueryStrategyVersion,
  };
}
