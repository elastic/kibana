/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RiskScoreKpiRequestOptions } from '../../../../../../common/api/search_strategy';
import { RiskScoreEntity, RiskScoreFields } from '../../../../../../common/search_strategy';
import { createQueryFilterClauses } from '../../../../../utils/build_query';

export const buildKpiRiskScoreQuery = ({
  defaultIndex,
  filterQuery,
  entity,
  timerange,
}: RiskScoreKpiRequestOptions) => {
  const filter = [...createQueryFilterClauses(filterQuery)];

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
    track_total_hits: false,
    body: {
      aggs: {
        risk: {
          terms: {
            field:
              entity === RiskScoreEntity.user ? RiskScoreFields.userRisk : RiskScoreFields.hostRisk,
          },
          aggs: {
            unique_entries: {
              cardinality: {
                field:
                  entity === RiskScoreEntity.user
                    ? RiskScoreFields.userName
                    : RiskScoreFields.hostName,
              },
            },
          },
        },
      },
      query: {
        bool: {
          filter,
        },
      },
      size: 0,
    },
  };

  return dslQuery;
};
