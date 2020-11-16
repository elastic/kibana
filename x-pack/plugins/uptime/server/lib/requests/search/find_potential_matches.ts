/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { QueryContext } from './query_context';

/**
 * This is the first phase of the query. In it, we find all monitor IDs that have ever matched the given filters.
 * @param queryContext the data and resources needed to perform the query
 * @param size the minimum size of the matches to chunk
 *  * @param index where to start for query
 */
export const findPotentialMatches = async (
  queryContext: QueryContext,
  size: number,
  index: number
) => {
  const { body: queryResult } = await query(queryContext, size, index);
  const monitorIds: string[] = [];

  get<any>(queryResult, 'hits.hits', []).forEach((b: any) => {
    const monitorId = b._source.monitor.id;
    monitorIds.push(monitorId);
  });

  return {
    monitorIds,
    searchAfter: queryResult.aggregations?.monitors?.after_key,
    totalMonitors: queryResult.aggregations?.totalMonitors?.value,
  };
};

const query = async (queryContext: QueryContext, size: number, index: number) => {
  const body = await queryBody(queryContext, size, index);

  const params = {
    index: queryContext.heartbeatIndices,
    body,
  };

  return await queryContext.search(params);
};

const queryBody = async (queryContext: QueryContext, size: number, index: number) => {
  const filters = await queryContext.dateAndCustomFilters();

  const sortField = queryContext.sortField;

  if (queryContext.statusFilter) {
    filters.push({ match: { 'monitor.status': queryContext.statusFilter } });
  }

  const sort = sortField
    ? [
        {
          [sortField]: {
            order: queryContext.sortDirection,
          },
        },
      ]
    : undefined;

  if (sortField === 'summary.down' && sort) {
    sort.push({
      '@timestamp': {
        order: 'desc',
      },
    });
  }

  return {
    sort,
    size,
    from: index * size,
    query: { bool: { filter: filters } },
    collapse: {
      field: 'monitor.id',
    },
    _source: 'monitor.id',
    aggs: {
      has_timespan: {
        filter: {
          exists: { field: 'monitor.timespan' },
        },
      },
      totalMonitors: {
        cardinality: {
          field: 'monitor.id',
        },
      },
    },
  };
};
