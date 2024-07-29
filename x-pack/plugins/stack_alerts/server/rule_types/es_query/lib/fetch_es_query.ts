/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IScopedClusterClient, Logger } from '@kbn/core/server';
import {
  BUCKET_SELECTOR_FIELD,
  buildAggregation,
  isCountAggregation,
  parseAggregationResults,
} from '@kbn/triggers-actions-ui-plugin/common';
import { isGroupAggregation } from '@kbn/triggers-actions-ui-plugin/common';
import { ES_QUERY_ID } from '@kbn/rule-data-utils';
import { getComparatorScript } from '../../../../common';
import { OnlyEsQueryRuleParams } from '../types';
import { buildSortedEventsQuery } from '../../../../common/build_sorted_events_query';
import { getParsedQuery } from '../util';

export interface FetchEsQueryOpts {
  ruleId: string;
  name: string;
  params: OnlyEsQueryRuleParams;
  timestamp: string | undefined;
  publicBaseUrl: string;
  spacePrefix: string;
  services: {
    scopedClusterClient: IScopedClusterClient;
    logger: Logger;
  };
  alertLimit?: number;
  dateStart: string;
  dateEnd: string;
}

/**
 * Fetching matching documents for a given rule from elasticsearch by a given index and query
 */
export async function fetchEsQuery({
  ruleId,
  name,
  params,
  spacePrefix,
  publicBaseUrl,
  timestamp,
  services,
  alertLimit,
  dateStart,
  dateEnd,
}: FetchEsQueryOpts) {
  const { scopedClusterClient, logger } = services;
  const esClient = scopedClusterClient.asCurrentUser;
  const isGroupAgg = isGroupAggregation(params.termField);
  const isCountAgg = isCountAggregation(params.aggType);
  const {
    query,
    fields,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    runtime_mappings,
    _source,
  } = getParsedQuery(params);

  const filter =
    timestamp && params.excludeHitsFromPreviousRun
      ? {
          bool: {
            filter: [
              query,
              {
                bool: {
                  must_not: [
                    {
                      bool: {
                        filter: [
                          {
                            range: {
                              [params.timeField]: {
                                lte: timestamp,
                                format: 'strict_date_optional_time',
                              },
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        }
      : query;

  const sortedQuery = buildSortedEventsQuery({
    index: params.index,
    from: dateStart,
    to: dateEnd,
    filter,
    size: isGroupAgg ? 0 : params.size,
    sortOrder: 'desc',
    searchAfterSortId: undefined,
    timeField: params.timeField,
    track_total_hits: true,
    fields,
    runtime_mappings,
    _source,
    aggs: buildAggregation({
      aggType: params.aggType,
      aggField: params.aggField,
      termField: params.termField,
      termSize: params.termSize,
      sourceFieldsParams: params.sourceFields,
      condition: {
        resultLimit: alertLimit,
        conditionScript: getComparatorScript(
          params.thresholdComparator,
          params.threshold,
          BUCKET_SELECTOR_FIELD
        ),
      },
      ...(isGroupAgg ? { topHitsSize: params.size } : {}),
    }),
  });

  logger.debug(
    () => `es query rule ${ES_QUERY_ID}:${ruleId} "${name}" query - ${JSON.stringify(sortedQuery)}`
  );

  const { body: searchResult } = await esClient.search(sortedQuery, { meta: true });

  logger.debug(
    () =>
      ` es query rule ${ES_QUERY_ID}:${ruleId} "${name}" result - ${JSON.stringify(searchResult)}`
  );

  const link = `${publicBaseUrl}${spacePrefix}/app/management/insightsAndAlerting/triggersActions/rule/${ruleId}`;

  return {
    parsedResults: parseAggregationResults({
      isCountAgg,
      isGroupAgg,
      esResult: searchResult,
      resultLimit: alertLimit,
      sourceFieldsParams: params.sourceFields,
    }),
    link,
    query: sortedQuery,
    index: params.index,
  };
}
