/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { KibanaRequest } from '@kbn/core/server';
import {
  ENDPOINT_DEFAULT_PAGE,
  ENDPOINT_DEFAULT_PAGE_SIZE,
  metadataCurrentIndexPattern,
  METADATA_UNITED_INDEX,
} from '../../../../common/endpoint/constants';
import { EndpointAppContext } from '../../types';
import { buildStatusesKuery } from './support/agent_status';
import { GetMetadataListRequestQuery } from '../../../../common/endpoint/schema/metadata';

/**
 * 00000000-0000-0000-0000-000000000000 is initial Elastic Agent id sent by Endpoint before policy is configured
 * 11111111-1111-1111-1111-111111111111 is Elastic Agent id sent by Endpoint when policy does not contain an id
 */
const IGNORED_ELASTIC_AGENT_IDS = [
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
];

export interface QueryBuilderOptions {
  page: number;
  pageSize: number;
  kuery?: string;
  unenrolledAgentIds?: string[];
  statusAgentIds?: string[];
}

// sort using either event.created, or HostDetails.event.created,
// depending on whichever exists. This works for QueryStrat v1 and v2, and the v2+ schema change.
// using unmapped_type avoids errors when the given field doesn't exist, and sets to the 0-value for that type
// effectively ignoring it
// https://www.elastic.co/guide/en/elasticsearch/reference/current/sort-search-results.html#_ignoring_unmapped_fields
export const MetadataSortMethod: estypes.SortCombinations[] = [
  {
    'event.created': {
      order: 'desc',
      unmapped_type: 'date',
    },
  },
  {
    'HostDetails.event.created': {
      order: 'desc',
      unmapped_type: 'date',
    },
  },
];

export async function kibanaRequestToMetadataListESQuery(
  queryBuilderOptions: QueryBuilderOptions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Record<string, any>> {
  return {
    body: {
      query: buildQueryBody(
        queryBuilderOptions?.kuery,
        IGNORED_ELASTIC_AGENT_IDS.concat(queryBuilderOptions?.unenrolledAgentIds ?? []),
        queryBuilderOptions?.statusAgentIds
      ),
      track_total_hits: true,
      sort: MetadataSortMethod,
    },
    from: queryBuilderOptions.page * queryBuilderOptions.pageSize,
    size: queryBuilderOptions.pageSize,
    index: metadataCurrentIndexPattern,
  };
}

export async function getPagingProperties(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  request: KibanaRequest<any, any, any>,
  endpointAppContext: EndpointAppContext
) {
  const pagingProperties: { page_size?: number; page_index?: number } = {};
  if (request?.body?.paging_properties) {
    for (const property of request.body.paging_properties) {
      Object.assign(
        pagingProperties,
        ...Object.keys(property).map((key) => ({ [key]: property[key] }))
      );
    }
  }
  return {
    pageSize: pagingProperties.page_size || ENDPOINT_DEFAULT_PAGE_SIZE,
    pageIndex: pagingProperties.page_index || ENDPOINT_DEFAULT_PAGE,
  };
}

function buildQueryBody(
  kuery: string = '',
  unerolledAgentIds: string[] | undefined,
  statusAgentIds: string[] | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  // the filtered properties may be preceded by 'HostDetails' under an older index mapping
  const filterUnenrolledAgents =
    unerolledAgentIds && unerolledAgentIds.length > 0
      ? {
          must_not: [
            { terms: { 'elastic.agent.id': unerolledAgentIds } }, // OR
            { terms: { 'HostDetails.elastic.agent.id': unerolledAgentIds } },
          ],
        }
      : null;
  const filterStatusAgents =
    statusAgentIds && statusAgentIds.length
      ? {
          filter: [
            {
              bool: {
                // OR's the two together
                should: [
                  { terms: { 'elastic.agent.id': statusAgentIds } },
                  { terms: { 'HostDetails.elastic.agent.id': statusAgentIds } },
                ],
              },
            },
          ],
        }
      : null;

  const idFilter = {
    bool: {
      ...filterUnenrolledAgents,
      ...filterStatusAgents,
    },
  };

  if (kuery) {
    const kqlQuery = toElasticsearchQuery(fromKueryExpression(kuery));
    const q = [];
    if (filterUnenrolledAgents || filterStatusAgents) {
      q.push(idFilter);
    }
    q.push({ ...kqlQuery });
    return {
      bool: { must: q },
    };
  }
  return filterUnenrolledAgents || filterStatusAgents
    ? idFilter
    : {
        match_all: {},
      };
}

export function getESQueryHostMetadataByID(agentID: string): estypes.SearchRequest {
  return {
    body: {
      query: {
        bool: {
          filter: [
            {
              bool: {
                should: [
                  { term: { 'agent.id': agentID } },
                  { term: { 'HostDetails.agent.id': agentID } },
                ],
              },
            },
          ],
        },
      },
      sort: MetadataSortMethod,
      size: 1,
    },
    index: metadataCurrentIndexPattern,
  };
}

export function getESQueryHostMetadataByFleetAgentIds(
  fleetAgentIds: string[]
): estypes.SearchRequest {
  return {
    body: {
      query: {
        bool: {
          filter: [
            {
              bool: {
                should: [{ terms: { 'elastic.agent.id': fleetAgentIds } }],
              },
            },
          ],
        },
      },
      sort: MetadataSortMethod,
    },
    index: metadataCurrentIndexPattern,
  };
}

export function getESQueryHostMetadataByIDs(agentIDs: string[]) {
  return {
    body: {
      query: {
        bool: {
          filter: [
            {
              bool: {
                should: [
                  { terms: { 'agent.id': agentIDs } },
                  { terms: { 'HostDetails.agent.id': agentIDs } },
                ],
              },
            },
          ],
        },
      },
      sort: MetadataSortMethod,
    },
    index: metadataCurrentIndexPattern,
  };
}

interface BuildUnitedIndexQueryResponse {
  body: {
    query: Record<string, unknown>;
    track_total_hits: boolean;
    sort: estypes.SortCombinations[];
  };
  from: number;
  size: number;
  index: string;
}

export async function buildUnitedIndexQuery(
  queryOptions: GetMetadataListRequestQuery,
  endpointPolicyIds: string[] = []
): Promise<BuildUnitedIndexQueryResponse> {
  const {
    page = ENDPOINT_DEFAULT_PAGE,
    pageSize = ENDPOINT_DEFAULT_PAGE_SIZE,
    hostStatuses = [],
    kuery = '',
  } = queryOptions || {};

  const statusesKuery = buildStatusesKuery(hostStatuses);

  const filterIgnoredAgents = {
    must_not: { terms: { 'agent.id': IGNORED_ELASTIC_AGENT_IDS } },
  };
  const filterEndpointPolicyAgents = {
    filter: [
      // must contain an endpoint policy id
      {
        terms: { 'united.agent.policy_id': endpointPolicyIds },
      },
      // doc contains both agent and metadata
      { exists: { field: 'united.endpoint.agent.id' } },
      { exists: { field: 'united.agent.agent.id' } },
      // agent is enrolled
      {
        term: {
          'united.agent.active': {
            value: true,
          },
        },
      },
    ],
  };

  const idFilter = {
    bool: {
      ...filterIgnoredAgents,
      ...filterEndpointPolicyAgents,
    },
  };

  let query: BuildUnitedIndexQueryResponse['body']['query'] = idFilter;

  if (statusesKuery || kuery) {
    const kqlQuery = toElasticsearchQuery(fromKueryExpression(kuery ?? ''));
    const q = [];

    if (filterIgnoredAgents || filterEndpointPolicyAgents) {
      q.push(idFilter);
    }

    if (statusesKuery) {
      q.push(toElasticsearchQuery(fromKueryExpression(statusesKuery)));
    }
    q.push({ ...kqlQuery });
    query = {
      bool: { must: q },
    };
  }

  return {
    body: {
      query,
      track_total_hits: true,
      sort: MetadataSortMethod,
    },
    from: page * pageSize,
    size: pageSize,
    index: METADATA_UNITED_INDEX,
  };
}
