/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Sort } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  Direction,
  RiskScoreRequestOptions,
  RiskScoreFields,
  RiskScoreSortField,
} from '../../../../../../common/search_strategy';
import { createQueryFilterClauses } from '../../../../../utils/build_query';

export const QUERY_SIZE = 10;

export const buildRiskScoreQuery = ({
  timerange,
  filterQuery,
  defaultIndex,
  pagination: { querySize, cursorStart } = {
    querySize: QUERY_SIZE,
    cursorStart: 0,
  },
  sort,
}: RiskScoreRequestOptions) => {
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

  const dslQuery = {
    index: defaultIndex,
    allow_no_indices: false,
    ignore_unavailable: true,
    track_total_hits: true,
    size: querySize,
    from: cursorStart,
    body: {
      query: { bool: { filter } },
      sort: getQueryOrder(sort),
    },
  };

  return dslQuery;
};

const getQueryOrder = (sort?: RiskScoreSortField): Sort => {
  if (!sort) {
    return [
      {
        '@timestamp': Direction.desc,
      },
    ];
  }

  if (sort.field === RiskScoreFields.risk) {
    return [{ [RiskScoreFields.riskScore]: sort.direction }];
  }

  return [{ [sort.field]: sort.direction }];
};
