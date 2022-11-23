/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse, SearchRequest } from '@kbn/data-plugin/common';
import { get, getOr } from 'lodash/fp';

import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import type { AggregationsMinAggregate } from '@elastic/elasticsearch/lib/api/types';
import type { SecuritySolutionFactory } from '../../types';
import type {
  RiskScoreRequestOptions,
  RiskQueries,
  BucketItem,
  HostRiskScore,
  UserRiskScore,
} from '../../../../../../common/search_strategy';
import { RiskScoreEntity } from '../../../../../../common/search_strategy';
import { inspectStringifyObject } from '../../../../../utils/build_query';
import { buildRiskScoreQuery } from './query.risk_score.dsl';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';
import { getTotalCount } from '../../cti/event_enrichment/helpers';

export const riskScore: SecuritySolutionFactory<
  RiskQueries.hostsRiskScore | RiskQueries.usersRiskScore
> = {
  buildDsl: (options: RiskScoreRequestOptions) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }

    return buildRiskScoreQuery(options);
  },
  parse: async (
    options: RiskScoreRequestOptions,
    response: IEsSearchResponse,
    deps?: {
      spaceId?: string;
      ruleDataClient?: IRuleDataClient | null;
    }
  ) => {
    const inspect = {
      dsl: [inspectStringifyObject(buildRiskScoreQuery(options))],
    };

    const totalCount = getTotalCount(response.rawResponse.hits.total);
    const hits = response?.rawResponse?.hits?.hits;
    const data = hits?.map((hit) => hit._source) ?? [];
    const nameField = options.riskScoreEntity === RiskScoreEntity.host ? 'host.name' : 'user.name';
    const names = data.map((risk) => get(nameField, risk) ?? '');

    const enhancedData =
      deps && options.includeAlertsCount
        ? await enhanceData(data, names, nameField, deps.ruleDataClient, deps.spaceId)
        : data;

    return {
      ...response,
      inspect,
      totalCount,
      data: enhancedData,
    };
  },
};

export type EnhancedDataBucket = {
  oldestAlertTimestamp: AggregationsMinAggregate;
} & BucketItem;

async function enhanceData(
  data: Array<HostRiskScore | UserRiskScore>,
  names: string[],
  nameField: string,
  ruleDataClient?: IRuleDataClient | null,
  spaceId?: string
): Promise<Array<HostRiskScore | UserRiskScore>> {
  const ruleDataReader = ruleDataClient?.getReader({ namespace: spaceId });
  const query = getAlertsQueryForEntity(names, nameField);
  const response = await ruleDataReader?.search(query);
  const buckets: EnhancedDataBucket[] = getOr([], 'aggregations.alertsByEntity.buckets', response);

  const enhancedAlertsDataByEntityName: Record<
    string,
    { count: number; oldestAlertTimestamp: string }
  > = buckets.reduce(
    (acc, { key, doc_count: count, oldestAlertTimestamp }) => ({
      ...acc,
      [key]: { count, oldestAlertTimestamp: oldestAlertTimestamp.value_as_string },
    }),
    {}
  );

  return data.map((risk) => ({
    ...risk,
    alertsCount: enhancedAlertsDataByEntityName[get(nameField, risk)]?.count ?? 0,
    oldestAlertTimestamp:
      enhancedAlertsDataByEntityName[get(nameField, risk)]?.oldestAlertTimestamp ?? 0,
  }));
}

const getAlertsQueryForEntity = (names: string[], nameField: string): SearchRequest => ({
  size: 0,
  query: {
    bool: {
      filter: [
        { term: { 'kibana.alert.workflow_status': 'open' } },
        { terms: { [nameField]: names } },
      ],
    },
  },
  aggs: {
    alertsByEntity: {
      terms: {
        field: nameField,
      },
      aggs: {
        oldestAlertTimestamp: {
          min: { field: '@timestamp' },
        },
      },
    },
  },
});
