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
  pagination: { querySize, cursorStart } = {
    querySize: QUERY_SIZE,
    cursorStart: 0,
  },
  sort,
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

  const dslQuery = {
    index: defaultIndex,
    allow_no_indices: false,
    ignore_unavailable: true,
    track_total_hits: true,
    size: querySize,
    from: cursorStart,
    body: {
      query: { bool: { filter } },
      sort: [getQueryOrder(sort)],
    },
  };

  return dslQuery;
};

const getQueryOrder = (sort?: HostRiskScoreSortField) => {
  if (!sort) {
    return {
      '@timestamp': Direction.desc,
    };
  }

  if (sort.field === HostRiskScoreFields.risk) {
    return { [`${HostRiskScoreFields.risk}.keyword`]: sort.direction };
  }

  return { [sort.field]: sort.direction };
};
