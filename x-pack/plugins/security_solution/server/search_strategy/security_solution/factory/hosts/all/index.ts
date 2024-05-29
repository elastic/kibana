/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '@kbn/search-types';
import type { IScopedClusterClient } from '@kbn/core/server';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';
import type {
  HostAggEsItem,
  HostsStrategyResponse,
  HostsQueries,
  HostsEdges,
} from '../../../../../../common/search_strategy/security_solution/hosts';

import type { HostRiskScore } from '../../../../../../common/search_strategy';
import {
  RiskQueries,
  RiskScoreEntity,
  getHostRiskIndex,
  buildHostNamesFilter,
} from '../../../../../../common/search_strategy';

import { inspectStringifyObject } from '../../../../../utils/build_query';
import type { SecuritySolutionFactory } from '../../types';
import { buildHostsQuery } from './query.all_hosts.dsl';
import { formatHostEdgesData, HOSTS_FIELDS } from './helpers';

import type { EndpointAppContext } from '../../../../../endpoint/types';
import { buildRiskScoreQuery } from '../../risk_score/all/query.risk_score.dsl';
import { buildAssetCriticalityQuery } from '../../asset_criticality/query.asset_criticality.dsl';
import { getAssetCriticalityIndex } from '@kbn/security-solution-plugin/common/entity_analytics/asset_criticality';
import { AssetCriticalityRecord } from '@kbn/security-solution-plugin/common/api/entity_analytics/asset_criticality';

export const allHosts: SecuritySolutionFactory<HostsQueries.hosts> = {
  buildDsl: (options) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    return buildHostsQuery(options);
  },
  parse: async (
    options,
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

    const enhancedEdges = deps?.spaceId
      ? await enhanceEdges(
          edges,
          hostNames,
          deps.spaceId,
          deps.esClient,
          options.isNewRiskScoreModuleInstalled
        )
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
  esClient: IScopedClusterClient,
  isNewRiskScoreModuleInstalled: boolean
): Promise<HostsEdges[]> {
  const hostRiskData = await getHostRiskData(
    esClient,
    spaceId,
    hostNames,
    isNewRiskScoreModuleInstalled
  );

  const criticality = await getHostCriticalityData(esClient, hostNames);

  const criticalityData = criticality?.hits.hits.reduce(
    (acc, hit) => ({
      ...acc,
      [hit?._source?.id_value ?? '']: hit?._source?.criticality_level,
    }),
    {}
  );

  const hostsRiskByHostName: Record<string, string> | undefined = hostRiskData?.hits.hits.reduce(
    (acc, hit) => ({
      ...acc,
      [hit._source?.host.name ?? '']: hit._source?.host?.risk?.calculated_level,
    }),
    {}
  );

  const result = hostsRiskByHostName
    ? edges.map(({ node, cursor }) => ({
        node: {
          ...node,
          risk: hostsRiskByHostName[node._id ?? ''],
          criticality: criticalityData?.[node._id ?? ''],
        },
        cursor,
      }))
    : edges;

  console.log('hostRiskData', hostsRiskByHostName);
  console.log('criticalityData', criticalityData);
  console.log('result', result);
  return result;
}

export async function getHostRiskData(
  esClient: IScopedClusterClient,
  spaceId: string,
  hostNames: string[],
  isNewRiskScoreModuleInstalled: boolean
) {
  try {
    const hostRiskResponse = await esClient.asCurrentUser.search<HostRiskScore>(
      buildRiskScoreQuery({
        defaultIndex: [getHostRiskIndex(spaceId, true, isNewRiskScoreModuleInstalled)],
        filterQuery: buildHostNamesFilter(hostNames),
        riskScoreEntity: RiskScoreEntity.host,
        factoryQueryType: RiskQueries.hostsRiskScore,
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

export async function getHostCriticalityData(esClient: IScopedClusterClient, hostNames: string[]) {
  try {
    const criticalityResponse = await esClient.asCurrentUser.search<AssetCriticalityRecord>(
      buildAssetCriticalityQuery({
        defaultIndex: [getAssetCriticalityIndex('default')], // TODO:(@tiansivive) move to constant or import from somewhere else
        filterQuery: { terms: { id_value: hostNames } },
      })
    );
    return criticalityResponse;
  } catch (error) {
    if (error?.meta?.body?.error?.type !== 'index_not_found_exception') {
      throw error;
    }
    return undefined;
  }
}
