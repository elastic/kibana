/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { HostsKpiAuthenticationsRequestOptions } from '../../../../../../../common/search_strategy/security_solution/hosts';
import { createQueryFilterClauses } from '../../../../../../utils/build_query';

export const buildHostsKpiAuthenticationsQuerySummary = ({
  filterQuery,
  timerange: { from, to },
  defaultIndex,
}: HostsKpiAuthenticationsRequestOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      range: {
        '@timestamp': {
          // TODO: Should we have the front end round down for us instead?
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
      aggs: {
        authentication_success: {
          sum: {
            field: 'metrics.event.authentication.success.value_count',
          },
        },
        authentication_success_histogram: {
          auto_date_histogram: {
            field: '@timestamp',
            buckets: 6,
          },
          aggs: {
            count: {
              sum: {
                field: 'metrics.event.authentication.success.value_count',
              },
            },
          },
        },
        authentication_failure: {
          sum: {
            field: 'metrics.event.authentication.failure.value_count',
          },
        },
        authentication_failure_histogram: {
          auto_date_histogram: {
            field: '@timestamp',
            buckets: 6,
          },
          aggs: {
            count: {
              sum: {
                field: 'metrics.event.authentication.failure.value_count',
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
