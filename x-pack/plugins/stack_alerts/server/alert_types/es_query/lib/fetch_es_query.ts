/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IScopedClusterClient, Logger } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { OnlyEsQueryRuleParams } from '../types';
import { buildSortedEventsQuery } from '../../../../common/build_sorted_events_query';
import { ES_QUERY_ID } from '../constants';
import { getSearchParams } from './get_search_params';

/**
 * Fetching matching documents for a given rule from elasticsearch by a given index and query
 */
export async function fetchEsQuery(
  ruleId: string,
  name: string,
  params: OnlyEsQueryRuleParams,
  timestamp: string | undefined,
  services: {
    scopedClusterClient: IScopedClusterClient;
    logger: Logger;
  }
) {
  const { scopedClusterClient, logger } = services;
  const esClient = scopedClusterClient.asCurrentUser;
  const { parsedQuery, dateStart, dateEnd } = getSearchParams(params);

  const filter = timestamp
    ? {
        bool: {
          filter: [
            parsedQuery.query,
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
    : parsedQuery.query;

  const query = buildSortedEventsQuery({
    index: params.index,
    from: dateStart,
    to: dateEnd,
    filter,
    size: params.size,
    sortOrder: 'desc',
    searchAfterSortId: undefined,
    timeField: params.timeField,
    track_total_hits: true,
  });

  logger.debug(`es query rule ${ES_QUERY_ID}:${ruleId} "${name}" query - ${JSON.stringify(query)}`);

  const { body: searchResult } = await esClient.search(query, { meta: true });

  logger.debug(
    ` es query rule ${ES_QUERY_ID}:${ruleId} "${name}" result - ${JSON.stringify(searchResult)}`
  );
  return {
    numMatches: (searchResult.hits.total as estypes.SearchTotalHits).value,
    searchResult,
    dateStart,
    dateEnd,
  };
}
