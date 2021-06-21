/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchRequest } from '@elastic/elasticsearch/api/types';
import { SearchResponse } from 'elasticsearch';
import { HostMetadata } from '../../../common/endpoint/types';
import { SecuritySolutionRequestHandlerContext } from '../../types';
import { getESQueryHostMetadataByIDs } from '../routes/metadata/query_builders';
import { EndpointAppContext } from '../types';

export async function getAgentIDsForEndpoints(
  endpointIDs: string[],
  requestHandlerContext: SecuritySolutionRequestHandlerContext,
  endpointAppContext: EndpointAppContext
): Promise<string[]> {
  const queryStrategy = await endpointAppContext.service
    ?.getMetadataService()
    ?.queryStrategy(requestHandlerContext.core.savedObjects.client);

  const query = getESQueryHostMetadataByIDs(endpointIDs, queryStrategy!);
  const esClient = requestHandlerContext.core.elasticsearch.client.asCurrentUser;
  const { body } = await esClient.search<HostMetadata>(query as SearchRequest);
  const hosts = queryStrategy!.queryResponseToHostListResult(body as SearchResponse<HostMetadata>);

  return hosts.resultList.map((x: HostMetadata): string => x.elastic.agent.id);
}
