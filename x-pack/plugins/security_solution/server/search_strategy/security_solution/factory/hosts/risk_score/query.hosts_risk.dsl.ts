/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Direction,
  HostsRiskScoreRequestOptions,
  HostRiskScoreFields,
  HostRiskScoreSortField,
} from '../../../../../../common/search_strategy';

import { createQueryFilterClauses } from '../../../../../utils/build_query';

export const QUERY_SIZE = 10;

export const buildHostsRiskScoreQuery = ({
  timerange,
  hostNames,
  filterQuery,
  defaultIndex,
  pagination: { querySize, cursorStart },
  sort,
  onlyLatest = true,
}: HostsRiskScoreRequestOptions) => {
  const filter = createQueryFilterClauses(filterQuery);

  if (timerange) {
    filter.push({
      range: {
        '@timestamp': {
          gte: timerange.from,
          lte: timerange.to,
          format: 'strict_date_optional_time',
        },
      },
    });
  }

  if (hostNames) {
    filter.push({ terms: { 'host.name': hostNames } });
  }
  const sortOrder = getQuerySort(sort);
  const dslQuery = {
    index: defaultIndex,
    allow_no_indices: false,
    ignore_unavailable: true,
    track_total_hits: true,
    size: querySize,
    from: cursorStart,
    body: {
      query: { bool: { filter } },
      ...(!onlyLatest ? { sort: [{ [sortOrder.field]: sortOrder.direction }] } : {}),
      ...(onlyLatest
        ? {
            aggregations: {
              hosts: {
                terms: {
                  field: 'host.name',
                  order: { [`latest_risk_hit[${sortOrder.field}]`]: sortOrder.direction },
                },
                aggs: {
                  latest_risk_hit: {
                    top_metrics: {
                      metrics: [
                        { field: 'host.name' },
                        { field: 'risk_stats.risk_score' },
                        { field: '@timestamp' },
                        { field: 'risk.keyword' },
                      ],
                      sort: { '@timestamp': 'desc' },
                    },
                  },
                },
              },
              host_count: { cardinality: { field: 'host.name' } },
            },
          }
        : {}),
      ...(onlyLatest ? { size: 0 } : {}),
    },
  };

  return dslQuery;
};

const getQuerySort = (sort?: HostRiskScoreSortField): HostRiskScoreSortField => {
  if (!sort) {
    return {
      field: HostRiskScoreFields.timestamp,
      direction: Direction.desc,
    };
  }

  if (sort.field === HostRiskScoreFields.risk) {
    return {
      field: HostRiskScoreFields.riskScore,
      direction: sort.direction,
    };
  }

  return sort;
};
