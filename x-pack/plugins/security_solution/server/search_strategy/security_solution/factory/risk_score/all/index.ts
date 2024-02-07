/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse, SearchRequest, TimeRange } from '@kbn/data-plugin/common';
import { get, getOr } from 'lodash/fp';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import type { AggregationsMinAggregate } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { SecuritySolutionFactory } from '../../types';
import type {
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
  buildDsl: (options) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }

    return buildRiskScoreQuery(options);
  },
  parse: async (
    options,
    response: IEsSearchResponse,
    deps?: {
      spaceId?: string;
      esClient: IScopedClusterClient;
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
        ? await enhanceData(
            data,
            names,
            nameField,
            deps.esClient,
            deps.ruleDataClient,
            deps.spaceId,
            options.alertsTimerange
          )
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
  esClient: IScopedClusterClient,
  ruleDataClient?: IRuleDataClient | null,
  spaceId?: string,
  timerange?: TimeRange
): Promise<Array<HostRiskScore | UserRiskScore>> {
  const indexPattern = ruleDataClient?.indexNameWithNamespace(spaceId ?? 'default');
  const query = getAlertsQueryForEntity(names, nameField, timerange, indexPattern);
  const response = await esClient.asCurrentUser.search(query);
  const buckets: EnhancedDataBucket[] = getOr([], 'aggregations.alertsByEntity.buckets', response);

  const enhancedAlertsDataByEntityName = buckets.reduce<
    Record<string, { count: number; oldestAlertTimestamp: string }>
  >((acc, { key, doc_count: count, oldestAlertTimestamp }) => {
    acc[key] = { count, oldestAlertTimestamp: oldestAlertTimestamp.value_as_string as string };
    return acc;
  }, {});

  return data.map((risk) => ({
    ...risk,
    alertsCount: enhancedAlertsDataByEntityName[get(nameField, risk)]?.count ?? 0,
    oldestAlertTimestamp:
      enhancedAlertsDataByEntityName[get(nameField, risk)]?.oldestAlertTimestamp ?? 0,
  }));
}

const getAlertsQueryForEntity = (
  names: string[],
  nameField: string,
  timerange: TimeRange | undefined,
  indexPattern: string | undefined
): SearchRequest => {
  return {
    size: 0,
    index: indexPattern,
    query: {
      bool: {
        filter: [
          { term: { 'kibana.alert.workflow_status': 'open' } },
          { terms: { [nameField]: names } },
          ...(timerange
            ? [
                {
                  range: {
                    '@timestamp': {
                      gte: timerange.from,
                      lte: timerange.to,
                      format: 'strict_date_optional_time',
                    },
                  },
                },
              ]
            : []),
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
  };
};
