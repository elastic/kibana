/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger } from 'kibana/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { OnlyEsQueryAlertParams } from '../../types';
import { IAbortableClusterClient } from '../../../../../../alerting/server';
import { buildSortedEventsQuery } from '../../../../../common/build_sorted_events_query';
import { ES_QUERY_ID } from '../../constants';
import { getSearchParams } from './get_search_params';

export async function fetchEsQuery(
  alertId: string,
  params: OnlyEsQueryAlertParams,
  timestamp: string | undefined,
  services: {
    search: IAbortableClusterClient;
    logger: Logger;
  }
) {
  const { search, logger } = services;
  const abortableEsClient = search.asCurrentUser;
  const { parsedQuery, dateStart, dateEnd } = getSearchParams(params);

  // During each alert execution, we run the configured query, get a hit count
  // (hits.total) and retrieve up to params.size hits. We
  // evaluate the threshold condition using the value of hits.total. If the threshold
  // condition is met, the hits are counted toward the query match and we update
  // the alert state with the timestamp of the latest hit. In the next execution
  // of the alert, the latestTimestamp will be used to gate the query in order to
  // avoid counting a document multiple times.

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

  logger.debug(
    `es query alert ${ES_QUERY_ID}:${alertId} "${name}" query - ${JSON.stringify(query)}`
  );

  const { body: searchResult } = await abortableEsClient.search(query);

  logger.debug(
    ` es query alert ${ES_QUERY_ID}:${alertId} "${name}" result - ${JSON.stringify(searchResult)}`
  );
  return {
    numMatches: (searchResult.hits.total as estypes.SearchTotalHits).value,
    searchResult,
    dateStart,
    dateEnd,
  };
}
