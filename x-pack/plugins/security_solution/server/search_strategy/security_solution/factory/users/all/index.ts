/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '@kbn/search-types';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { AggregationsAggregate, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import _ from 'lodash';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';

import { inspectStringifyObject } from '../../../../../utils/build_query';
import type { SecuritySolutionFactory } from '../../types';
import { buildUsersQuery } from './query.all_users.dsl';
import type { UsersQueries } from '../../../../../../common/search_strategy/security_solution/users';
import type {
  User,
  UsersStrategyResponse,
} from '../../../../../../common/search_strategy/security_solution/users/all';
import type { AllUsersAggEsItem } from '../../../../../../common/search_strategy/security_solution/users/common';
import { buildRiskScoreQuery } from '../../risk_score/all/query.risk_score.dsl';
import type { RiskSeverity, UserRiskScore } from '../../../../../../common/search_strategy';
import {
  buildUserNamesFilter,
  getUserRiskIndex,
  RiskScoreEntity,
  RiskQueries,
} from '../../../../../../common/search_strategy';
import { buildAssetCriticalityQuery } from '../../asset_criticality/query.asset_criticality.dsl';
import { getAssetCriticalityIndex } from '../../../../../../common/entity_analytics/asset_criticality';
import type { AssetCriticalityRecord } from '../../../../../../common/api/entity_analytics';

export const allUsers: SecuritySolutionFactory<UsersQueries.users> = {
  buildDsl: (options) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    return buildUsersQuery(options);
  },
  parse: async (
    options,
    response: IEsSearchResponse<unknown>,
    deps?: {
      esClient: IScopedClusterClient;
      spaceId?: string;
    }
  ): Promise<UsersStrategyResponse> => {
    const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;
    const inspect = {
      dsl: [inspectStringifyObject(buildUsersQuery(options))],
    };

    const buckets: AllUsersAggEsItem[] = getOr(
      [],
      'aggregations.user_data.buckets',
      response.rawResponse
    );

    const totalCount = getOr(0, 'aggregations.user_count.value', response.rawResponse);

    const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;

    const users: User[] = buckets.map(
      (bucket: AllUsersAggEsItem) => ({
        name: bucket.key,
        lastSeen: getOr(null, `lastSeen.value_as_string`, bucket),
        domain: getOr(null, `domain.hits.hits[0].fields['user.domain']`, bucket),
      }),
      {}
    );

    const showMorePagesIndicator = totalCount > fakeTotalCount;

    const edges = users.splice(cursorStart, querySize - cursorStart);
    const userNames = edges.map(({ name }) => name);
    const enhancedEdges = deps?.spaceId
      ? await enhanceEdges(edges, userNames, deps.spaceId, deps.esClient)
      : edges;

    return {
      ...response,
      inspect,
      totalCount,
      users: enhancedEdges,
      pageInfo: {
        activePage: activePage ?? 0,
        fakeTotalCount,
        showMorePagesIndicator,
      },
    };
  },
};

async function enhanceEdges(
  edges: User[],
  userNames: string[],
  spaceId: string,
  esClient: IScopedClusterClient
): Promise<User[]> {
  const [riskByUserName, criticalityByUserName] = await Promise.all([
    getUserRiskData(esClient, spaceId, userNames).then(
      buildRecordFromAggs('user.name', 'user.risk.calculated_level')
    ),
    getUserCriticalityData(esClient, userNames).then(
      buildRecordFromAggs('id_value', 'criticality_level')
    ),
  ]);

  return edges.map(({ name, lastSeen, domain }) => ({
    name,
    lastSeen,
    domain,
    risk: riskByUserName?.[name ?? ''] as RiskSeverity,
    criticality: criticalityByUserName?.[name ?? ''],
  }));
}

export async function getUserRiskData(
  esClient: IScopedClusterClient,
  spaceId: string,
  userNames: string[]
) {
  try {
    const userRiskResponse = await esClient.asCurrentUser.search<UserRiskScore>(
      buildRiskScoreQuery({
        defaultIndex: [getUserRiskIndex(spaceId, true)],
        filterQuery: buildUserNamesFilter(userNames),
        riskScoreEntity: RiskScoreEntity.user,
        factoryQueryType: RiskQueries.usersRiskScore,
      })
    );
    return userRiskResponse;
  } catch (error) {
    if (error?.meta?.body?.error?.type !== 'index_not_found_exception') {
      throw error;
    }
    return undefined;
  }
}

export async function getUserCriticalityData(esClient: IScopedClusterClient, hostNames: string[]) {
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

const buildRecordFromAggs =
  (key: string, path: string) =>
  <T>(
    data: SearchResponse<T, Record<string, AggregationsAggregate>> | undefined
  ): Record<string, string> | undefined =>
    data?.hits.hits.reduce(
      (acc, hit) => ({
        ...acc,
        [_.get(hit._source, key) || '']: _.get(hit._source, path),
      }),
      {}
    );
