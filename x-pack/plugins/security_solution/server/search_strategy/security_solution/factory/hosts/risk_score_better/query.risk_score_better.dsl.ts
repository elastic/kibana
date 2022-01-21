/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import {
  Direction,
  RiskScoreBetterFields,
  RiskScoreBetterRequestOptions,
  SortField,
} from '../../../../../../common/search_strategy';
import { createQueryFilterClauses } from '../../../../../utils/build_query';
import { assertUnreachable } from '../../../../../../common/utility_types';

export const buildRiskScoreBetterQuery = ({
  defaultIndex,
  docValueFields,
  filterQuery,
  pagination: { querySize },
  sort,
  timerange: { from, to },
}: RiskScoreBetterRequestOptions) => {
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
    allow_no_indices: true,
    index: defaultIndex,
    ignore_unavailable: true,
    track_total_hits: true,
    body: {
      ...(!isEmpty(docValueFields) ? { docvalue_fields: docValueFields } : {}),
      aggregations: {
        host_data: {
          terms: {
            size: querySize,
            field: 'host.name',
            order: getQueryOrder(sort),
          },
          aggs: {
            risk_score: {
              sum: {
                field: 'risk_stats.risk_score',
              },
            },
            risk: {
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

type QueryOrder =
  | { [RiskScoreBetterFields.risk]: Direction }
  | { [RiskScoreBetterFields.riskScore]: Direction }
  | { _key: Direction };

const getQueryOrder = (sort: SortField<RiskScoreBetterFields>): QueryOrder => {
  switch (sort.field) {
    case RiskScoreBetterFields.risk:
      return { [RiskScoreBetterFields.risk]: sort.direction };
    case RiskScoreBetterFields.riskScore:
      return { [RiskScoreBetterFields.riskScore]: sort.direction };
    // TODO: Steph/Host Risk
    // case RiskScoreBetterFields.ruleRisks:
    case RiskScoreBetterFields.hostName:
      return { _key: sort.direction };
    default:
      return assertUnreachable(sort.field);
  }
};
