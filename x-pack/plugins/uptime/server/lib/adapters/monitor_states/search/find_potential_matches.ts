/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, set } from 'lodash';
import { QueryContext } from '../elasticsearch_monitor_states_adapter';
import { CursorDirection, INDEX_NAMES } from '../../../../../common';
import { makeDateRangeFilter } from '../../../helper/make_date_rate_filter';

// This is the first phase of the query. In it, we find the most recent check groups that matched the given query.
// Note that these check groups may not be the most recent groups for the matching monitor ID! We'll filter those
/**
 * This is the first phase of the query. In it, we find the most recent check groups that matched the given query.
 * Note that these check groups may not be the most recent groups for the matching monitor ID. They'll be filtered
 * out in the next phase.
 * @param queryContext the data and resources needed to perform the query
 * @param searchAfter indicates where Elasticsearch should continue querying on subsequent requests, if at all
 * @param size the minimum size of the matches to chunk
 */
export const findPotentialMatches = async (
  queryContext: QueryContext,
  searchAfter: any,
  size: number
) => {
  const queryResult = await query(queryContext, searchAfter, size);

  const checkGroups = new Set<string>();
  const monitorIds: string[] = [];
  get<any>(queryResult, 'aggregations.monitors.buckets', []).forEach((b: any) => {
    const monitorId = b.key.monitor_id;
    monitorIds.push(monitorId);

    // Doc count can be zero if status filter optimization does not match
    if (b.doc_count > 0) {
      // Here we grab the most recent 2 check groups per location and add them to the list.
      // Why 2? Because the most recent one may be a partial result from mode: all, and hence not match a summary doc.
      b.locations.buckets.forEach((lb: any) => {
        lb.ips.buckets.forEach((ib: any) => {
          ib.top.hits.hits.forEach((h: any) => {
            checkGroups.add(h._source.monitor.check_group);
          });
        });
      });
    }
  });

  return {
    monitorIds,
    checkGroups,
    searchAfter: queryResult.aggregations.monitors.after_key,
  };
};

const query = async (queryContext: QueryContext, searchAfter: any, size: number) => {
  const body = queryBody(queryContext, searchAfter, size);

  const params = {
    index: INDEX_NAMES.HEARTBEAT,
    body,
  };

  return await queryContext.search(params);
};

const queryBody = (queryContext: QueryContext, searchAfter: any, size: number) => {
  const compositeOrder = cursorDirectionToOrder(queryContext.pagination.cursorDirection);

  const filters: any[] = [
    makeDateRangeFilter(queryContext.dateRangeStart, queryContext.dateRangeEnd),
  ];
  if (queryContext.filterClause) {
    filters.push(queryContext.filterClause);
  }
  if (queryContext.statusFilter) {
    filters.push({ match: { 'monitor.status': queryContext.statusFilter } });
  }

  const body = {
    size: 0,
    query: { bool: { filter: filters } },
    aggs: {
      monitors: {
        composite: {
          size,
          sources: [
            {
              monitor_id: { terms: { field: 'monitor.id', order: compositeOrder } },
            },
          ],
        },
        aggs: {
          // Here we grab the most recent 2 check groups per location.
          // Why 2? Because the most recent one may not be for a summary, it may be incomplete.
          locations: {
            terms: { field: 'observer.geo.name', missing: '__missing__' },
            aggs: {
              ips: {
                terms: { field: 'monitor.ip', missing: '0.0.0.0' },
                aggs: {
                  top: {
                    top_hits: {
                      sort: [{ '@timestamp': 'desc' }],
                      _source: {
                        includes: ['monitor.check_group', '@timestamp'],
                      },
                      size: 2,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  if (searchAfter) {
    set(body, 'aggs.monitors.composite.after', searchAfter);
  }

  return body;
};

const cursorDirectionToOrder = (cd: CursorDirection): 'asc' | 'desc' => {
  return CursorDirection[cd] === CursorDirection.AFTER ? 'asc' : 'desc';
};
