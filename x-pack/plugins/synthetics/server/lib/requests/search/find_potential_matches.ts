/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@elastic/safer-lodash-set';
import { QueryContext } from './query_context';
import { EXCLUDE_RUN_ONCE_FILTER } from '../../../../common/constants/client_defaults';

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

  filters.push({ exists: { field: 'summary' } });

  filters.push(EXCLUDE_RUN_ONCE_FILTER);

  const body = {
    size: 0,
    query: {
      bool: {
        filter: filters,
        ...(queryContext.query
          ? {
              minimum_should_match: 1,
              should: [
                {
                  multi_match: {
                    query: escape(queryContext.query),
                    type: 'phrase_prefix',
                    fields: ['monitor.id.text', 'monitor.name.text', 'url.full.text'],
                  },
                },
              ],
            }
          : {}),
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
