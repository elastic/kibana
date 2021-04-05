/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { HostsKpiHostsRequestOptions } from '../../../../../../../common/search_strategy/security_solution/hosts';
import { createQueryFilterClauses } from '../../../../../../utils/build_query';

export const buildHostsKpiHostsQuerySummary = ({
  filterQuery,
  timerange: { from, to },
  defaultIndex,
}: HostsKpiHostsRequestOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      range: {
        '@timestamp': {
          // TODO: Do we want to round down here (or at all? or do we want to push this responsibility up the stack?)
          gte: moment(from).startOf('hour').toISOString(),
          lte: to,
          format: 'strict_date_optional_time',
        },
      },
    },
  ];

  const dslQuery = {
    index: defaultIndex,
    allowNoIndices: true,
    ignoreUnavailable: true,
    track_total_hits: false,
    body: {
      aggregations: {
        hosts: {
          cardinality: {
            field: 'host.name',
          },
        },
        hosts_histogram: {
          auto_date_histogram: {
            field: '@timestamp',
            buckets: 6,
          },
          aggs: {
            count: {
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
