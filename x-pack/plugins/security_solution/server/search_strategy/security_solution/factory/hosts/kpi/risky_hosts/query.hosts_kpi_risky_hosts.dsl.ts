/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HostsKpiRiskyHostsRequestOptions } from '../../../../../../../common/search_strategy/security_solution/hosts/kpi/risky_hosts';
import { createQueryFilterClauses } from '../../../../../../utils/build_query';

export const buildHostsKpiRiskyHostsQuery = ({
  defaultIndex,
  filterQuery,
  timerange,
}: HostsKpiRiskyHostsRequestOptions) => {
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
            field: 'risk.keyword',
          },
          aggs: {
            unique_hosts: {
              cardinality: {
                field: 'host.name',
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
