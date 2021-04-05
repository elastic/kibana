/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { NetworkKpiDnsRequestOptions } from '../../../../../../../common/search_strategy/security_solution/network';
import { createQueryFilterClauses } from '../../../../../../utils/build_query';

export const buildDnsQuerySummary = ({
  filterQuery,
  timerange: { from, to },
  defaultIndex,
}: NetworkKpiDnsRequestOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      range: {
        '@timestamp': {
          // TODO: Should the front end be sending this down instead?
          gte: moment(from).startOf('hour'),
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
        dns: {
          sum: {
            field: 'metrics.dns.queries.value_count',
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
