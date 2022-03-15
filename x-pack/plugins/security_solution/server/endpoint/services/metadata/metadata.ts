/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { HostMetadata } from '../../../../common/endpoint/types';
import { SecuritySolutionRequestHandlerContext } from '../../../types';
import { getESQueryHostMetadataByIDs } from '../../routes/metadata/query_builders';
import { queryResponseToHostListResult } from '../../routes/metadata/support/query_strategies';

// FIXME: fold this function into the EndpointMetadaService

export async function getMetadataForEndpoints(
  endpointIDs: string[],
  requestHandlerContext: SecuritySolutionRequestHandlerContext
): Promise<HostMetadata[]> {
  const query = getESQueryHostMetadataByIDs(endpointIDs);
  const esClient = requestHandlerContext.core.elasticsearch.client.asCurrentUser;
  const { body } = await esClient.search<HostMetadata>(query as estypes.SearchRequest, {
    meta: true,
  });
  const hosts = queryResponseToHostListResult(body as estypes.SearchResponse<HostMetadata>);
  return hosts.resultList;
}
