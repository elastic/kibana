/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { ApiResponse } from '@elastic/elasticsearch';
import { SearchResponse, SearchTotalHits } from '@elastic/elasticsearch/api/types';

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
  UnitedAgentMetadata,
  HostResultList,
  HostStatus,
} from '../../../../common/endpoint/types';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';

import {
  getESQueryHostMetadataByID,
  kibanaRequestToMetadataListESQuery,
  buildUnitedIndexQuery,
} from './query_builders';
import { Agent, AgentPolicy, PackagePolicy } from '../../../../../fleet/common/types/models';
import { AgentNotFoundError } from '../../../../../fleet/server';
import { EndpointAppContext, HostListQueryResult } from '../../types';
import { GetMetadataListRequestSchema, GetMetadataRequestSchema } from './index';
import { findAllUnenrolledAgentIds } from './support/unenroll';
import { getAllEndpointPackagePolicies } from './support/endpoint_package_policies';
import { findAgentIdsByStatus } from './support/agent_status';
import { EndpointAppContextService } from '../../endpoint_app_context_services';
import { fleetAgentStatusToEndpointHostStatus } from '../../utils';
import {
  queryResponseToHostListResult,
  queryResponseToHostResult,
} from './support/query_strategies';
import { NotFoundError } from '../../errors';
import { EndpointHostUnEnrolledError } from '../../services/metadata';
import { getAgentStatus } from '../../../../../fleet/common/services/agent_status';

export interface MetadataRequestContext {
  esClient?: IScopedClusterClient;
  endpointAppContextService: EndpointAppContextService;
  logger: Logger;
  requestHandlerContext?: SecuritySolutionRequestHandlerContext;
  savedObjectsClient?: SavedObjectsClientContract;
}

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

  // legacy check for Boom errors. `ts-ignore` is for the errors around non-standard error properties
  // @ts-ignore
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
    const agentService = endpointAppContext.service.getAgentService();
    if (agentService === undefined) {
      throw new Error('agentService not available');
    }

    const endpointPolicies = await getAllEndpointPackagePolicies(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      endpointAppContext.service.getPackagePolicyService()!,
      context.core.savedObjects.client
    );

    const { unitedIndexExists, unitedQueryResponse } = await queryUnitedIndex(
      context,
      request,
      endpointAppContext,
      logger,
      endpointPolicies
    );
    if (unitedIndexExists) {
      return response.ok({
        body: unitedQueryResponse,
      });
    }

    return response.ok({
      body: await legacyListMetadataQuery(
        context,
        request,
        endpointAppContext,
        logger,
        endpointPolicies
      ),
    });
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

  const response = await esClient.asCurrentUser.search<HostMetadata>(query);

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
  const statusIds = await findAgentIdsByStatus(
    agentService,
    context.core.elasticsearch.client.asCurrentUser,
    statusesToFilter
  );

  const queryParams = await kibanaRequestToMetadataListESQuery(request, endpointAppContext, {
    unenrolledAgentIds: unenrolledAgentIds.concat(IGNORED_ELASTIC_AGENT_IDS),
    statusAgentIds: statusIds,
  });

  const result = await context.core.elasticsearch.client.asCurrentUser.search<HostMetadata>(
    queryParams
  );
  const hostListQueryResult = queryResponseToHostListResult(result.body);
  return mapToHostResultList(queryParams, hostListQueryResult, metadataRequestContext);
}

async function queryUnitedIndex(
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest,
  endpointAppContext: EndpointAppContext,
  logger: Logger,
  endpointPolicies: PackagePolicy[]
): Promise<{
  unitedIndexExists: boolean;
  unitedQueryResponse: HostResultList;
}> {
  const endpointPolicyIds = endpointPolicies.map((policy) => policy.policy_id);
  const unitedIndexQuery = await buildUnitedIndexQuery(
    request,
    endpointAppContext,
    IGNORED_ELASTIC_AGENT_IDS,
    endpointPolicyIds
  );

  let unitedMetadataQueryResponse: ApiResponse<SearchResponse<UnitedAgentMetadata>>;
  try {
    unitedMetadataQueryResponse =
      await context.core.elasticsearch.client.asCurrentUser.search<UnitedAgentMetadata>(
        unitedIndexQuery
      );
  } catch (error) {
    const errorType = error?.meta?.body?.error?.type ?? '';

    // no united index means that the endpoint package hasn't been upgraded yet
    // this is expected so we fall back to the legacy query
    // errors other than index_not_found_exception are unexpected
    if (errorType !== 'index_not_found_exception') {
      logger.error(error);
      throw error;
    }
    return {
      unitedIndexExists: false,
      unitedQueryResponse: {} as HostResultList,
    };
  }

  const { hits: docs, total: docsCount } = unitedMetadataQueryResponse?.body?.hits || {};
  const agentPolicyIds: string[] = docs.map((doc) => doc._source?.united?.agent?.policy_id ?? '');

  const agentPolicies =
    (await endpointAppContext.service
      .getAgentPolicyService()
      ?.getByIds(context.core.savedObjects.client, agentPolicyIds)) ?? [];

  const agentPoliciesMap: Record<string, AgentPolicy> = agentPolicies.reduce(
    (acc, agentPolicy) => ({
      ...acc,
      [agentPolicy.id]: {
        ...agentPolicy,
      },
    }),
    {}
  );

  const endpointPoliciesMap: Record<string, PackagePolicy> = endpointPolicies.reduce(
    (acc, packagePolicy) => ({
      ...acc,
      [packagePolicy.policy_id]: packagePolicy,
    }),
    {}
  );

  const hosts = docs
    .filter((doc) => {
      const { endpoint: metadata, agent } = doc?._source?.united ?? {};
      return metadata && agent;
    })
    .map((doc) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const { endpoint: metadata, agent } = doc!._source!.united!;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const agentPolicy = agentPoliciesMap[agent.policy_id!];
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const endpointPolicy = endpointPoliciesMap[agent.policy_id!];
      const fleetAgentStatus = getAgentStatus(agent as Agent);

      return {
        metadata,
        host_status: fleetAgentStatusToEndpointHostStatus(fleetAgentStatus),
        policy_info: {
          agent: {
            applied: {
              id: agent.policy_id || '',
              revision: agent.policy_revision || 0,
            },
            configured: {
              id: agentPolicy?.id || '',
              revision: agentPolicy?.revision || 0,
            },
          },
          endpoint: {
            id: endpointPolicy?.id || '',
            revision: endpointPolicy?.revision || 0,
          },
        },
      } as HostInfo;
    });

  const unitedQueryResponse: HostResultList = {
    request_page_size: unitedIndexQuery.size,
    request_page_index: unitedIndexQuery.from,
    total: (docsCount as SearchTotalHits).value,
    hosts,
  };

  return {
    unitedIndexExists: true,
    unitedQueryResponse,
  };
}
