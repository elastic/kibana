/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFilterClause } from '../helper';
import { FetchMonitorListPaginationParams } from '../../../common/runtime_types';
import { UMElasticsearchQueryFn } from '../adapters/framework';
import { createEsQuery } from '../lib';

export const getMonitorListPagination: UMElasticsearchQueryFn<
  FetchMonitorListPaginationParams,
  any
> = async ({
  query,
  filters,
  statusFilter,
  uptimeEsClient,
  beforeMonitorId,
  afterMonitorId,
  dateRangeStart: from,
  dateRangeEnd: to,
}) => {
  const boolFilters = filters ? JSON.parse(filters) : null;
  const additionalFilters = [];

  if (boolFilters) {
    additionalFilters.push(boolFilters);
  }
  const filter = getFilterClause(from, to, additionalFilters);

  const params = createEsQuery({
    body: {
      query: {
        bool: {
          filter: [
            ...filter,
            ...(statusFilter ? [{ match: { 'monitor.status': statusFilter } }] : []),
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
