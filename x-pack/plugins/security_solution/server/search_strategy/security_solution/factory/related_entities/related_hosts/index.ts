/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import type { IScopedClusterClient } from '@kbn/core/server';
import { getOr } from 'lodash/fp';
import type { RiskSeverity } from '../../../../../../common/search_strategy/security_solution/risk_score/all';
import type { SecuritySolutionFactory } from '../../types';
import type { EndpointAppContext } from '../../../../../endpoint/types';
import type { RelatedEntitiesQueries } from '../../../../../../common/search_strategy/security_solution/related_entities';
import type {
  UsersRelatedHostsRequestOptions,
  UsersRelatedHostsStrategyResponse,
  RelatedHostBucket,
  RelatedHost,
} from '../../../../../../common/search_strategy/security_solution/related_entities/related_hosts';
import { buildRelatedHostsQuery } from './query.related_hosts.dsl';
import { getHostRiskData } from '../../hosts/all';
import { inspectStringifyObject } from '../../../../../utils/build_query';

export const usersRelatedHosts: SecuritySolutionFactory<RelatedEntitiesQueries.relatedHosts> = {
  buildDsl: (options: UsersRelatedHostsRequestOptions) => buildRelatedHostsQuery(options),
  parse: async (
    options: UsersRelatedHostsRequestOptions,
    response: IEsSearchResponse<unknown>,
    deps?: {
      esClient: IScopedClusterClient;
      spaceId?: string;
      endpointContext: EndpointAppContext;
    }
  ): Promise<UsersRelatedHostsStrategyResponse> => {
    const aggregations = response.rawResponse.aggregations;

    const inspect = {
      dsl: [inspectStringifyObject(buildRelatedHostsQuery(options))],
    };

    if (aggregations == null) {
      return { ...response, inspect, totalCount: 0, relatedHosts: [] };
    }

    const totalCount = getOr(0, 'aggregations.host_count.value', response.rawResponse);

    const buckets: RelatedHostBucket[] = getOr(
      [],
      'aggregations.host_data.buckets',
      response.rawResponse
    );
    const relatedHosts: RelatedHost[] = buckets.map(
      (bucket: RelatedHostBucket) => ({
        host: bucket.key,
        ip: bucket.ip?.buckets.map((ip) => ip.key) ?? [],
      }),
      {}
    );
    const enhancedHosts = deps?.spaceId
      ? await addHostRiskData(
          relatedHosts,
          deps.spaceId,
          deps.esClient,
          options.isNewRiskScoreModuleAvailable
        )
      : relatedHosts;

    return {
      ...response,
      inspect,
      totalCount,
      relatedHosts: enhancedHosts,
    };
  },
};

async function addHostRiskData(
  relatedHosts: RelatedHost[],
  spaceId: string,
  esClient: IScopedClusterClient,
  isNewRiskScoreModuleAvailable: boolean
): Promise<RelatedHost[]> {
  const hostNames = relatedHosts.map((item) => item.host);
  const hostRiskData = await getHostRiskData(
    esClient,
    spaceId,
    hostNames,
    isNewRiskScoreModuleAvailable
  );
  const hostsRiskByHostName: Record<string, RiskSeverity> | undefined =
    hostRiskData?.hits.hits.reduce(
      (acc, hit) => ({
        ...acc,
        [hit._source?.host.name ?? '']: hit._source?.host?.risk?.calculated_level,
      }),
      {}
    );

  return hostsRiskByHostName
    ? relatedHosts.map((item) => ({ ...item, risk: hostsRiskByHostName[item.host] }))
    : relatedHosts;
}
