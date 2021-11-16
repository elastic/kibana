/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { TypeOf } from '@kbn/config-schema';
import {
  IKibanaResponse,
  IScopedClusterClient,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
  RequestHandler,
  SavedObjectsClientContract,
} from '../../../../../../../src/core/server';
import {
  HostInfo,
  HostMetadata,
  HostResultList,
  HostStatus,
} from '../../../../common/endpoint/types';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';

import {
  getESQueryHostMetadataByID,
  getPagingProperties,
  kibanaRequestToMetadataListESQuery,
} from './query_builders';
import { Agent, PackagePolicy } from '../../../../../fleet/common/types/models';
import { AgentNotFoundError } from '../../../../../fleet/server';
import { EndpointAppContext, HostListQueryResult } from '../../types';
import { GetMetadataListRequestSchema, GetMetadataRequestSchema } from './index';
import { findAllUnenrolledAgentIds } from './support/unenroll';
import { getAllEndpointPackagePolicies } from './support/endpoint_package_policies';
import { findAgentIdsByStatus } from './support/agent_status';
import { EndpointAppContextService } from '../../endpoint_app_context_services';
import { catchAndWrapError, fleetAgentStatusToEndpointHostStatus } from '../../utils';
import {
  queryResponseToHostListResult,
  queryResponseToHostResult,
} from './support/query_strategies';
import { EndpointError, NotFoundError } from '../../errors';
import { EndpointHostUnEnrolledError } from '../../services/metadata';

export interface MetadataRequestContext {
  esClient?: IScopedClusterClient;
  endpointAppContextService: EndpointAppContextService;
  logger: Logger;
  requestHandlerContext?: SecuritySolutionRequestHandlerContext;
  savedObjectsClient?: SavedObjectsClientContract;
}

export const getLogger = (endpointAppContext: EndpointAppContext): Logger => {
  return endpointAppContext.logFactory.get('metadata');
};

const errorHandler = <E extends Error>(
  logger: Logger,
  res: KibanaResponseFactory,
  error: E
): IKibanaResponse => {
  if (error instanceof NotFoundError) {
    return res.notFound({ body: error });
  }

  if (error instanceof EndpointHostUnEnrolledError) {
    return res.badRequest({ body: error });
  }

  // legacy check for Boom errors. for the errors around non-standard error properties
  // @ts-expect-error TS2339
  const boomStatusCode = error.isBoom && error?.output?.statusCode;
  if (boomStatusCode) {
    return res.customError({
      statusCode: boomStatusCode,
      body: error,
    });
  }

  // Kibana CORE will take care of `500` errors when the handler `throw`'s, including logging the error
  throw error;
};

export const getMetadataListRequestHandler = function (
  endpointAppContext: EndpointAppContext,
  logger: Logger
): RequestHandler<
  unknown,
  unknown,
  TypeOf<typeof GetMetadataListRequestSchema.body>,
  SecuritySolutionRequestHandlerContext
> {
  return async (context, request, response) => {
    const endpointMetadataService = endpointAppContext.service.getEndpointMetadataService();
    if (!endpointMetadataService) {
      throw new EndpointError('endpoint metadata service not available');
    }

    let doesUnitedIndexExist = false;
    let didUnitedIndexError = false;
    let body: HostResultList = {
      hosts: [],
      total: 0,
      request_page_size: 0,
      request_page_index: 0,
    };

    try {
      doesUnitedIndexExist = await endpointMetadataService.doesUnitedIndexExist(
        context.core.elasticsearch.client.asCurrentUser
      );
    } catch (error) {
      // for better UX, try legacy query instead of immediately failing on united index error
      didUnitedIndexError = true;
    }

    // If no unified Index present, then perform a search using the legacy approach
    if (!doesUnitedIndexExist || didUnitedIndexError) {
      const endpointPolicies = await getAllEndpointPackagePolicies(
        endpointAppContext.service.getPackagePolicyService(),
        context.core.savedObjects.client
      );

      body = await legacyListMetadataQuery(
        context,
        request,
        endpointAppContext,
        logger,
        endpointPolicies
      );
      return response.ok({ body });
    }

    // Unified index is installed and being used - perform search using new approach
    try {
      const pagingProperties = await getPagingProperties(request, endpointAppContext);
      const { data, page, total, pageSize } = await endpointMetadataService.getHostMetadataList(
        context.core.elasticsearch.client.asCurrentUser,
        {
          page: pagingProperties.pageIndex + 1,
          pageSize: pagingProperties.pageSize,
          filters: request.body?.filters || {},
        }
      );

      body = {
        hosts: data,
        request_page_index: page - 1,
        total,
        request_page_size: pageSize,
      };
    } catch (error) {
      return errorHandler(logger, response, error);
    }

    return response.ok({ body });
  };
};

export const getMetadataRequestHandler = function (
  endpointAppContext: EndpointAppContext,
  logger: Logger
): RequestHandler<
  TypeOf<typeof GetMetadataRequestSchema.params>,
  unknown,
  unknown,
  SecuritySolutionRequestHandlerContext
> {
  return async (context, request, response) => {
    const endpointMetadataService = endpointAppContext.service.getEndpointMetadataService();

    try {
      return response.ok({
        body: await endpointMetadataService.getEnrichedHostMetadata(
          context.core.elasticsearch.client.asCurrentUser,
          request.params.id
        ),
      });
    } catch (error) {
      return errorHandler(logger, response, error);
    }
  };
};

export async function getHostMetaData(
  metadataRequestContext: MetadataRequestContext,
  id: string
): Promise<HostMetadata | undefined> {
  if (
    !metadataRequestContext.esClient &&
    !metadataRequestContext.requestHandlerContext?.core.elasticsearch.client
  ) {
    throw Boom.badRequest('esClient not found');
  }

  if (
    !metadataRequestContext.savedObjectsClient &&
    !metadataRequestContext.requestHandlerContext?.core.savedObjects
  ) {
    throw Boom.badRequest('savedObjectsClient not found');
  }

  const esClient = (metadataRequestContext?.esClient ??
    metadataRequestContext.requestHandlerContext?.core.elasticsearch
      .client) as IScopedClusterClient;

  const query = getESQueryHostMetadataByID(id);

  const response = await esClient.asCurrentUser
    .search<HostMetadata>(query)
    .catch(catchAndWrapError);

  const hostResult = queryResponseToHostResult(response.body);

  const hostMetadata = hostResult.result;
  if (!hostMetadata) {
    return undefined;
  }

  return hostMetadata;
}

export async function getHostData(
  metadataRequestContext: MetadataRequestContext,
  id: string
): Promise<HostInfo | undefined> {
  if (!metadataRequestContext.savedObjectsClient) {
    throw Boom.badRequest('savedObjectsClient not found');
  }

  if (
    !metadataRequestContext.esClient &&
    !metadataRequestContext.requestHandlerContext?.core.elasticsearch.client
  ) {
    throw Boom.badRequest('esClient not found');
  }

  const hostMetadata = await getHostMetaData(metadataRequestContext, id);

  if (!hostMetadata) {
    return undefined;
  }

  const agent = await findAgent(metadataRequestContext, hostMetadata);

  if (agent && !agent.active) {
    throw Boom.badRequest('the requested endpoint is unenrolled');
  }

  const metadata = await enrichHostMetadata(hostMetadata, metadataRequestContext);

  return metadata;
}

async function findAgent(
  metadataRequestContext: MetadataRequestContext,
  hostMetadata: HostMetadata
): Promise<Agent | undefined> {
  try {
    if (
      !metadataRequestContext.esClient &&
      !metadataRequestContext.requestHandlerContext?.core.elasticsearch.client
    ) {
      throw new Error('esClient not found');
    }

    const esClient = (metadataRequestContext?.esClient ??
      metadataRequestContext.requestHandlerContext?.core.elasticsearch
        .client) as IScopedClusterClient;

    return await metadataRequestContext.endpointAppContextService
      ?.getAgentService()
      ?.getAgent(esClient.asCurrentUser, hostMetadata.elastic.agent.id);
  } catch (e) {
    if (e instanceof AgentNotFoundError) {
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
  if ((hostListQueryResult.resultList?.length ?? 0) > 0) {
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

export async function enrichHostMetadata(
  hostMetadata: HostMetadata,
  metadataRequestContext: MetadataRequestContext
): Promise<HostInfo> {
  let hostStatus = HostStatus.UNHEALTHY;
  let elasticAgentId = hostMetadata?.elastic?.agent?.id;
  const log = metadataRequestContext.logger;

  try {
    if (
      !metadataRequestContext.esClient &&
      !metadataRequestContext.requestHandlerContext?.core.elasticsearch.client
    ) {
      throw new Error('esClient not found');
    }

    if (
      !metadataRequestContext.savedObjectsClient &&
      !metadataRequestContext.requestHandlerContext?.core.savedObjects
    ) {
      throw new Error('esSavedObjectClient not found');
    }
  } catch (e) {
    log.error(e);
    throw e;
  }

  const esClient = (metadataRequestContext?.esClient ??
    metadataRequestContext.requestHandlerContext?.core.elasticsearch
      .client) as IScopedClusterClient;

  const esSavedObjectClient =
    metadataRequestContext?.savedObjectsClient ??
    (metadataRequestContext.requestHandlerContext?.core.savedObjects
      .client as SavedObjectsClientContract);

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
      ?.getAgentStatusById(esClient.asCurrentUser, elasticAgentId);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    hostStatus = fleetAgentStatusToEndpointHostStatus(status!);
  } catch (e) {
    if (e instanceof AgentNotFoundError) {
      log.warn(`agent with id ${elasticAgentId} not found`);
    } else {
      log.error(e);
      throw e;
    }
  }

  let policyInfo: HostInfo['policy_info'];
  try {
    const agent = await metadataRequestContext.endpointAppContextService
      ?.getAgentService()
      ?.getAgent(esClient.asCurrentUser, elasticAgentId);
    const agentPolicy = await metadataRequestContext.endpointAppContextService
      .getAgentPolicyService()
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      ?.get(esSavedObjectClient, agent?.policy_id!, true);
    const endpointPolicy = ((agentPolicy?.package_policies || []) as PackagePolicy[]).find(
      (policy: PackagePolicy) => policy.package?.name === 'endpoint'
    );

    policyInfo = {
      agent: {
        applied: {
          revision: agent?.policy_revision || 0,
          id: agent?.policy_id || '',
        },
        configured: {
          revision: agentPolicy?.revision || 0,
          id: agentPolicy?.id || '',
        },
      },
      endpoint: {
        revision: endpointPolicy?.revision || 0,
        id: endpointPolicy?.id || '',
      },
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
    policy_info: policyInfo,
  };
}

async function legacyListMetadataQuery(
  context: SecuritySolutionRequestHandlerContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  request: KibanaRequest<any, any, any>,
  endpointAppContext: EndpointAppContext,
  logger: Logger,
  endpointPolicies: PackagePolicy[]
): Promise<HostResultList> {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const agentService = endpointAppContext.service.getAgentService()!;
  if (agentService === undefined) {
    throw new Error('agentService not available');
  }

  const metadataRequestContext: MetadataRequestContext = {
    esClient: context.core.elasticsearch.client,
    endpointAppContextService: endpointAppContext.service,
    logger,
    requestHandlerContext: context,
    savedObjectsClient: context.core.savedObjects.client,
  };

  const endpointPolicyIds = endpointPolicies.map((policy) => policy.policy_id);
  const unenrolledAgentIds = await findAllUnenrolledAgentIds(
    agentService,
    context.core.elasticsearch.client.asCurrentUser,
    endpointPolicyIds
  );

  const statusesToFilter = request?.body?.filters?.host_status ?? [];
  const statusAgentIds = await findAgentIdsByStatus(
    agentService,
    context.core.elasticsearch.client.asCurrentUser,
    statusesToFilter
  );

  const queryParams = await kibanaRequestToMetadataListESQuery(request, endpointAppContext, {
    unenrolledAgentIds,
    statusAgentIds,
  });

  const result = await context.core.elasticsearch.client.asCurrentUser.search<HostMetadata>(
    queryParams
  );
  const hostListQueryResult = queryResponseToHostListResult(result.body);
  return mapToHostResultList(queryParams, hostListQueryResult, metadataRequestContext);
}
