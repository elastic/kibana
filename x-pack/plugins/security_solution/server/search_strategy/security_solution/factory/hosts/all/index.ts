/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import { IScopedClusterClient } from '@kbn/core/server';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';
import {
  HostAggEsItem,
  HostsStrategyResponse,
  HostsQueries,
  HostsRequestOptions,
  HostsEdges,
} from '../../../../../../common/search_strategy/security_solution/hosts';

import {
  getHostRiskIndex,
  buildHostNamesFilter,
  HostsRiskScore,
} from '../../../../../../common/search_strategy';

import { inspectStringifyObject } from '../../../../../utils/build_query';
import { SecuritySolutionFactory } from '../../types';
import { buildHostsQuery } from './query.all_hosts.dsl';
import { formatHostEdgesData, HOSTS_FIELDS } from './helpers';

import { EndpointAppContext } from '../../../../../endpoint/types';
import { buildRiskScoreQuery } from '../../risk_score/all/query.risk_score.dsl';

export const allHosts: SecuritySolutionFactory<HostsQueries.hosts> = {
  buildDsl: (options: HostsRequestOptions) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    return buildHostsQuery(options);
  },
  parse: async (
    options: HostsRequestOptions,
    response: IEsSearchResponse<unknown>,
    deps?: {
      esClient: IScopedClusterClient;
      spaceId?: string;
      endpointContext: EndpointAppContext;
    }
  ): Promise<HostsStrategyResponse> => {
    const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;
    const totalCount = getOr(0, 'aggregations.host_count.value', response.rawResponse);
    const buckets: HostAggEsItem[] = getOr(
      [],
      'aggregations.host_data.buckets',
      response.rawResponse
    );
    const hostsEdges = buckets.map((bucket) => formatHostEdgesData(HOSTS_FIELDS, bucket));
    const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;
    const edges = hostsEdges.splice(cursorStart, querySize - cursorStart);
    const inspect = {
      dsl: [inspectStringifyObject(buildHostsQuery(options))],
    };
    const showMorePagesIndicator = totalCount > fakeTotalCount;

    const hostNames = edges.map((edge) => getOr('', 'node.host.name[0]', edge));

    const enhancedEdges =
      deps?.spaceId && deps?.endpointContext.experimentalFeatures.riskyHostsEnabled
        ? await enhanceEdges(edges, hostNames, deps.spaceId, deps.esClient)
        : edges;

    return {
      ...response,
      inspect,
      edges: enhancedEdges,
      totalCount,
      pageInfo: {
        activePage: activePage ?? 0,
        fakeTotalCount,
        showMorePagesIndicator,
      },
    };
  },
};

async function enhanceEdges(
  edges: HostsEdges[],
  hostNames: string[],
  spaceId: string,
  esClient: IScopedClusterClient
): Promise<HostsEdges[]> {
  const hostRiskData = await getHostRiskData(esClient, spaceId, hostNames);

  const hostsRiskByHostName: Record<string, string> | undefined = hostRiskData?.hits.hits.reduce(
    (acc, hit) => ({
      ...acc,
      [hit._source?.host.name ?? '']: hit._source?.risk,
    }),
    {}
  );

  return hostsRiskByHostName
    ? edges.map(({ node, cursor }) => ({
        node: {
          ...node,
          risk: hostsRiskByHostName[node._id ?? ''],
        },
        cursor,
      }))
    : edges;
}

async function getHostRiskData(
  esClient: IScopedClusterClient,
  spaceId: string,
  hostNames: string[]
) {
  try {
    const hostRiskResponse = await esClient.asCurrentUser.search<HostsRiskScore>(
      buildRiskScoreQuery({
        defaultIndex: [getHostRiskIndex(spaceId)],
        filterQuery: buildHostNamesFilter(hostNames),
      })
    );
    return hostRiskResponse;
  } catch (error) {
    if (error?.meta?.body?.error?.type !== 'index_not_found_exception') {
      throw error;
    }
    return undefined;
  }
}
