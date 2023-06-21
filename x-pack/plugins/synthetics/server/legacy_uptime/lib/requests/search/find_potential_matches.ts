/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import { getQueryStringFilter } from './get_query_string_filter';
import { QueryContext } from './query_context';
import {
  EXCLUDE_RUN_ONCE_FILTER,
  SUMMARY_FILTER,
} from '../../../../../common/constants/client_defaults';

/**
 * This is the first phase of the query. In it, we find all monitor IDs that have ever matched the given filters.
 * @param queryContext the data and resources needed to perform the query
 * @param searchAfter indicates where Elasticsearch should continue querying on subsequent requests, if at all
 * @param size the minimum size of the matches to chunk
 */
export const findPotentialMatches = async (
  queryContext: QueryContext,
  searchAfter: any,
  size: number
) => {
  const { body: queryResult } = await query(queryContext, searchAfter, size);
  const monitorIds: string[] = [];

  (queryResult.aggregations?.monitors.buckets ?? []).forEach((b: any) => {
    const monitorId = b.key.monitor_id;
    monitorIds.push(monitorId as string);
  });

  return {
    monitorIds,
    searchAfter: queryResult.aggregations?.monitors?.after_key,
  };
};

const query = async (queryContext: QueryContext, searchAfter: any, size: number) => {
  const body = await queryBody(queryContext, searchAfter, size);

  const params = {
    body,
  };

  const response = await queryContext.search(params, 'getMonitorList-potentialMatches');
  return response;
};

const queryBody = async (queryContext: QueryContext, searchAfter: any, size: number) => {
  const filters = await queryContext.dateAndCustomFilters();

  if (queryContext.statusFilter) {
    filters.push({ match: { 'monitor.status': queryContext.statusFilter } });
  }

  filters.push(SUMMARY_FILTER, EXCLUDE_RUN_ONCE_FILTER);

  if (queryContext.query) {
    filters.push(getQueryStringFilter(queryContext.query));
  }

  const body = {
    size: 0,
    query: {
      bool: {
        filter: filters,
      },
    },
    aggs: {
      monitors: {
        composite: {
          size,
          sources: [
            {
              monitor_id: {
                terms: { field: 'monitor.id' as const, order: queryContext.cursorOrder() },
              },
            },
          ],
        },
      },
    },
  };

  if (searchAfter) {
    set(body, 'aggs.monitors.composite.after', searchAfter);
  }

  return body;
};
