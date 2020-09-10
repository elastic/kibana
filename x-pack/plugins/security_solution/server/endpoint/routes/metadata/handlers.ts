/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import Boom from 'boom';
import { RequestHandlerContext, Logger } from 'kibana/server';
import {
  HostInfo,
  HostMetadata,
  HostResultList,
  HostStatus,
} from '../../../../common/endpoint/types';
import { getESQueryHostMetadataByID, metadataQueryConfigV1 } from './query_builders';
import { Agent, AgentStatus } from '../../../../../ingest_manager/common/types/models';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AgentService } from '../../../../../ingest_manager/server/services';

interface HitSource {
  _source: HostMetadata;
}

export interface MetadataRequestContext {
  agentService: AgentService;
  logger: Logger;
  requestHandlerContext: RequestHandlerContext;
}

const HOST_STATUS_MAPPING = new Map<AgentStatus, HostStatus>([
  ['online', HostStatus.ONLINE],
  ['offline', HostStatus.OFFLINE],
  ['unenrolling', HostStatus.UNENROLLING],
]);

export async function getHostData(
  metadataRequestContext: MetadataRequestContext,
  id: string
): Promise<HostInfo | undefined> {
  const query = getESQueryHostMetadataByID(id, metadataQueryConfigV1());
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
