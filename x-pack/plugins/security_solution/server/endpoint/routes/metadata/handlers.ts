/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type {
  IScopedClusterClient,
  Logger,
  RequestHandler,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { PackagePolicy } from '@kbn/fleet-plugin/common/types/models';
import { AgentNotFoundError } from '@kbn/fleet-plugin/server';
import { errorHandler } from '../error_handler';
import type {
  HostInfo,
  HostMetadata,
  HostResultList,
  MetadataListResponse,
} from '../../../../common/endpoint/types';
import { HostStatus } from '../../../../common/endpoint/types';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';

import { kibanaRequestToMetadataListESQuery } from './query_builders';
import type { EndpointAppContext, HostListQueryResult } from '../../types';
import type { GetMetadataRequestSchema } from '.';
import { findAllUnenrolledAgentIds } from './support/unenroll';
import { findAgentIdsByStatus } from './support/agent_status';
import type { EndpointAppContextService } from '../../endpoint_app_context_services';
import { fleetAgentStatusToEndpointHostStatus } from '../../utils';
import { queryResponseToHostListResult } from './support/query_strategies';
import type { GetMetadataListRequestQuery } from '../../../../common/endpoint/schema/metadata';
import {
  ENDPOINT_DEFAULT_PAGE,
  ENDPOINT_DEFAULT_PAGE_SIZE,
  METADATA_TRANSFORMS_PATTERN,
} from '../../../../common/endpoint/constants';
import type { EndpointFleetServicesInterface } from '../../services/fleet/endpoint_fleet_services_factory';

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

export function getMetadataListRequestHandler(
  endpointAppContext: EndpointAppContext,
  logger: Logger
): RequestHandler<
  unknown,
  GetMetadataListRequestQuery,
  unknown,
  SecuritySolutionRequestHandlerContext
> {
  return async (context, request, response) => {
    const endpointMetadataService = endpointAppContext.service.getEndpointMetadataService();
    const fleetServices = endpointAppContext.service.getScopedFleetServices(request);
    const esClient = (await context.core).elasticsearch.client.asInternalUser;

    let doesUnitedIndexExist = false;
    let didUnitedIndexError = false;
    let body: MetadataListResponse = {
      data: [],
      total: 0,
      page: 0,
      pageSize: 0,
    };

    try {
      doesUnitedIndexExist = await endpointMetadataService.doesUnitedIndexExist(esClient);
    } catch (error) {
      // for better UX, try legacy query instead of immediately failing on united index error
      didUnitedIndexError = true;
    }

    // If no unified Index present, then perform a search using the legacy approach
    if (!doesUnitedIndexExist || didUnitedIndexError) {
      const endpointPolicies = await endpointMetadataService.getAllEndpointPackagePolicies();

      const legacyResponse = await legacyListMetadataQuery(
        context,
        endpointAppContext,
        fleetServices,
        logger,
        endpointPolicies,
        request.query
      );
      body = {
        data: legacyResponse.hosts,
        total: legacyResponse.total,
        page: request.query.page || ENDPOINT_DEFAULT_PAGE,
        pageSize: request.query.pageSize || ENDPOINT_DEFAULT_PAGE_SIZE,
      };
      return response.ok({ body });
    }

    // Unified index is installed and being used - perform search using new approach
    try {
      const { data, total } = await endpointMetadataService.getHostMetadataList(
        esClient,
        fleetServices,
        request.query
      );

      body = {
        data,
        total,
        page: request.query.page || ENDPOINT_DEFAULT_PAGE,
        pageSize: request.query.pageSize || ENDPOINT_DEFAULT_PAGE_SIZE,
      };
    } catch (error) {
      return errorHandler(logger, response, error);
    }

    return response.ok({ body });
  };
}

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
      const esClient = (await context.core).elasticsearch.client;
      return response.ok({
        body: await endpointMetadataService.getEnrichedHostMetadata(
          esClient.asInternalUser,
          endpointAppContext.service.getScopedFleetServices(request),
          request.params.id
        ),
      });
    } catch (error) {
      return errorHandler(logger, response, error);
    }
  };
};

export function getMetadataTransformStatsHandler(
  logger: Logger
): RequestHandler<unknown, unknown, unknown, SecuritySolutionRequestHandlerContext> {
  return async (context, _, response) => {
    const esClient = (await context.core).elasticsearch.client.asInternalUser;
    try {
      const transformStats = await esClient.transform.getTransformStats({
        transform_id: METADATA_TRANSFORMS_PATTERN,
        allow_no_match: true,
      });
      return response.ok({
        body: transformStats,
      });
    } catch (error) {
      return errorHandler(logger, response, error);
    }
  };
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
  const coreContext = await metadataRequestContext.requestHandlerContext?.core;

  try {
    if (!metadataRequestContext.esClient && !coreContext?.elasticsearch.client) {
      throw new Error('esClient not found');
    }

    if (!metadataRequestContext.savedObjectsClient && !coreContext?.savedObjects) {
      throw new Error('esSavedObjectClient not found');
    }
  } catch (e) {
    log.error(e);
    throw e;
  }

  const esSavedObjectClient =
    metadataRequestContext?.savedObjectsClient ??
    (coreContext?.savedObjects.client as SavedObjectsClientContract);
  const fleetContext = await metadataRequestContext.requestHandlerContext?.fleet;

  try {
    /**
     * Get agent status by elastic agent id if available or use the endpoint-agent id.
     */

    if (!elasticAgentId) {
      elasticAgentId = hostMetadata.agent.id;
      log.warn(`Missing elastic agent id, using host id instead ${elasticAgentId}`);
    }

    const status = await fleetContext?.agentClient.asCurrentUser.getAgentStatusById(elasticAgentId);
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
    const agent = await fleetContext?.agentClient.asCurrentUser.getAgent(elasticAgentId);
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
  endpointAppContext: EndpointAppContext,
  fleetServices: EndpointFleetServicesInterface,
  logger: Logger,
  endpointPolicies: PackagePolicy[],
  queryOptions: GetMetadataListRequestQuery
): Promise<HostResultList> {
  const fleetAgentClient = fleetServices.agent;
  const coreContext = await context.core;

  const metadataRequestContext: MetadataRequestContext = {
    esClient: coreContext.elasticsearch.client,
    endpointAppContextService: endpointAppContext.service,
    logger,
    requestHandlerContext: context,
    savedObjectsClient: coreContext.savedObjects.client,
  };

  const endpointPolicyIds = endpointPolicies.map((policy) => policy.policy_id);
  const esClient = coreContext.elasticsearch.client.asInternalUser;

  const unenrolledAgentIds = await findAllUnenrolledAgentIds(fleetAgentClient, endpointPolicyIds);

  const statusAgentIds = await findAgentIdsByStatus(
    fleetAgentClient,
    queryOptions?.hostStatuses || []
  );

  const queryParams = await kibanaRequestToMetadataListESQuery({
    page: queryOptions?.page || ENDPOINT_DEFAULT_PAGE,
    pageSize: queryOptions?.pageSize || ENDPOINT_DEFAULT_PAGE_SIZE,
    kuery: queryOptions?.kuery || '',
    unenrolledAgentIds,
    statusAgentIds,
  });

  const result = await esClient.search<HostMetadata>(queryParams);
  const hostListQueryResult = queryResponseToHostListResult(result);
  return mapToHostResultList(queryParams, hostListQueryResult, metadataRequestContext);
}
