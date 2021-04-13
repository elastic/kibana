/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FetchMonitorListPaginationParams } from '../../../common/runtime_types';
import { createEsQuery, UptimeESClient } from '../lib';
import { QueryContext } from './search';
import { CONTEXT_DEFAULTS } from '../../../common/constants';

export type MonitorListPaginationResult = ReturnType<typeof getMonitorListPagination>;

export const getMonitorListPagination = async ({
  query,
  filters,
  statusFilter,
  uptimeEsClient,
  beforeMonitorId,
  afterMonitorId,
  dateRangeStart,
  dateRangeEnd,
}: FetchMonitorListPaginationParams & { uptimeEsClient: UptimeESClient }) => {
  const boolFilters = filters ? JSON.parse(filters) : null;
  const additionalFilters = [];

  if (boolFilters) {
    additionalFilters.push(boolFilters);
  }
  const parsedFilters = filters && filters !== '' ? JSON.parse(filters) : null;

  const queryContext = new QueryContext(
    uptimeEsClient,
    dateRangeStart,
    dateRangeEnd,
    CONTEXT_DEFAULTS.CURSOR_PAGINATION,
    parsedFilters,
    10,
    statusFilter,
    query
  );

  const queryFilters = await queryContext.dateAndCustomFilters();

  if (statusFilter) {
    queryFilters.push({ match: { 'monitor.status': statusFilter } });
  }

  const params = createEsQuery({
    body: {
      query: {
        bool: {
          filter: [
            ...queryFilters,
            {
              exists: {
                field: 'summary',
              },
            },
          ],
          ...(query
            ? {
                minimum_should_match: 1,
                should: [
                  {
                    multi_match: {
                      query: escape(query),
                      type: 'phrase_prefix' as const,
                      fields: ['monitor.id.text', 'monitor.name.text', 'url.full.text'],
                    },
                  },
                ],
              }
            : {}),
        },
      },
      size: 0,
      aggs: {
        after: {
          composite: {
            size: 1,
            after: {
              monitorId: afterMonitorId,
            },
            sources: [
              {
                monitorId: {
                  terms: {
                    field: 'monitor.id',
                  },
                },
              },
            ],
          },
        },
        before: {
          composite: {
            size: 1,
            after: {
              monitorId: beforeMonitorId,
            },
            sources: [
              {
                monitorId: {
                  terms: {
                    field: 'monitor.id',
                    order: 'desc',
                  },
                },
              },
            ],
          },
        },
      },
    },
  });

  const { body: result } = await uptimeEsClient.search(params);

  return { result };
};
