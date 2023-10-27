/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseAggregationResults } from '@kbn/triggers-actions-ui-plugin/common';
import { SharePluginStart } from '@kbn/share-plugin/server';
import { IScopedClusterClient, Logger } from '@kbn/core/server';
import { OnlyEsqlQueryRuleParams } from '../types';
import { EsqlTable, toEsQueryHits } from '../../../../common';

export interface FetchEsqlQueryOpts {
  ruleId: string;
  alertLimit: number | undefined;
  params: OnlyEsqlQueryRuleParams;
  spacePrefix: string;
  publicBaseUrl: string;
  services: {
    logger: Logger;
    scopedClusterClient: IScopedClusterClient;
    share: SharePluginStart;
  };
  dateStart: string;
  dateEnd: string;
}

export async function fetchEsqlQuery({
  ruleId,
  alertLimit,
  params,
  services,
  spacePrefix,
  publicBaseUrl,
  dateStart,
  dateEnd,
}: FetchEsqlQueryOpts) {
  const { logger, scopedClusterClient } = services;
  const esClient = scopedClusterClient.asCurrentUser;
  const query = getEsqlQuery(params, alertLimit, dateStart, dateEnd);

  logger.debug(`ES|QL query rule (${ruleId}) query: ${JSON.stringify(query)}`);

  const response = await esClient.transport.request<EsqlTable>({
    method: 'POST',
    path: '/_esql',
    body: query,
  });

  const link = `${publicBaseUrl}${spacePrefix}/app/management/insightsAndAlerting/triggersActions/rule/${ruleId}`;

  return {
    link,
    numMatches: Number(response.values.length),
    parsedResults: parseAggregationResults({
      isCountAgg: true,
      isGroupAgg: false,
      esResult: {
        took: 0,
        timed_out: false,
        _shards: { failed: 0, successful: 0, total: 0 },
        hits: toEsQueryHits(response),
      },
      resultLimit: alertLimit,
    }),
    index: null,
  };
}

export const getEsqlQuery = (
  params: OnlyEsqlQueryRuleParams,
  alertLimit: number | undefined,
  dateStart: string,
  dateEnd: string
) => {
  const rangeFilter: unknown[] = [
    {
      range: {
        [params.timeField]: {
          lte: dateEnd,
          gt: dateStart,
          format: 'strict_date_optional_time',
        },
      },
    },
  ];

  const query = {
    query: alertLimit ? `${params.esqlQuery.esql} | limit ${alertLimit}` : params.esqlQuery.esql,
    filter: {
      bool: {
        filter: rangeFilter,
      },
    },
  };
  return query;
};
