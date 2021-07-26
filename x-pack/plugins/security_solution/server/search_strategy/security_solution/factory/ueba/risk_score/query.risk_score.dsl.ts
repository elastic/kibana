/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { Direction, RiskScoreRequestOptions } from '../../../../../../common/search_strategy';
import { createQueryFilterClauses } from '../../../../../utils/build_query';

export const buildRiskScoreQuery = ({
  defaultIndex,
  docValueFields,
  filterQuery,
  pagination: { querySize },
  sort,
  timerange: { from, to },
}: RiskScoreRequestOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      range: {
        '@timestamp': {
          gte: from,
          lte: to,
          format: 'strict_date_optional_time',
        },
      },
    },
  ];

  return {
    allowNoIndices: true,
    index: defaultIndex,
    ignoreUnavailable: true,
    track_total_hits: true,
    body: {
      ...(!isEmpty(docValueFields) ? { docvalue_fields: docValueFields } : {}),
      aggregations: {
        host_data: {
          terms: {
            field: 'host.name',
            order: {
              risk_score: Direction.desc,
            },
          },
          aggs: {
            risk_score: {
              sum: {
                field: 'risk_score',
              },
            },
            risk_keyword: {
              terms: {
                field: 'risk.keyword',
              },
            },
          },
        },
        host_count: {
          cardinality: {
            field: 'host.name',
          },
        },
      },
      query: { bool: { filter } },
      size: 0,
    },
  };
};
