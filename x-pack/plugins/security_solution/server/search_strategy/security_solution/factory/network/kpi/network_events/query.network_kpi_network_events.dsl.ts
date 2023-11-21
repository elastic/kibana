/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NetworkKpiEventsRequestOptions } from '../../../../../../../common/api/search_strategy';
import { createQueryFilterClauses } from '../../../../../../utils/build_query';
import { getIpFilter } from '../common';

export const buildNetworkEventsQuery = ({
  filterQuery,
  timerange: { from, to },
  defaultIndex,
}: NetworkKpiEventsRequestOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    ...getIpFilter(),
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

  const dslQuery = {
    index: defaultIndex,
    allow_no_indices: true,
    ignore_unavailable: true,
    track_total_hits: true,
    body: {
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
