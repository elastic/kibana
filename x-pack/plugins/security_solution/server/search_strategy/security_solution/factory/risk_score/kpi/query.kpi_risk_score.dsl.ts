/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskScoreEntity } from '../../../../../../common/search_strategy';
import type { KpiRiskScoreRequestOptions } from '../../../../../../common/search_strategy';
import { createQueryFilterClauses } from '../../../../../utils/build_query';

export const buildKpiRiskScoreQuery = ({
  defaultIndex,
  filterQuery,
  entity,
}: KpiRiskScoreRequestOptions) => {
  const filter = [...createQueryFilterClauses(filterQuery)];

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
              entity === RiskScoreEntity.user
                ? 'user.risk.calculated_level'
                : 'host.risk.calculated_level',
          },
          aggs: {
            unique_entries: {
              cardinality: {
                field: entity === RiskScoreEntity.user ? 'user.name' : 'host.name',
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
