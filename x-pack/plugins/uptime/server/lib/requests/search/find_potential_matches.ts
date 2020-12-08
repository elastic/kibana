/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { QueryContext } from './query_context';
import { Ping } from '../../../../common/runtime_types/ping';

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

  queryResult.hits.hits.forEach((b) => {
    const monitorId = (b._source as Ping).monitor.id;
    monitorIds.push(monitorId);
  });

  return {
    monitorIds,
  };
};

const query = async (queryContext: QueryContext, size: number, index: number) => {
  const filters = await queryContext.dateAndCustomFilters();

  const sortField = queryContext.sortField;

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

  const body = {
    sort,
    size,
    from: index * size + queryContext.size * queryContext.pageIndex,
    query: {
      bool: {
        filter: [
          ...filters,
          ...(queryContext.statusFilter
            ? [{ match: { 'monitor.status': queryContext.statusFilter } }]
            : []),
        ],
      },
    },
    collapse: {
      field: 'monitor.id',
    },
    _source: 'monitor.id',
  };

  const params = {
    body,
  };

  return await queryContext.search(params);
};
