/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HostsRiskyHostsRequestOptions } from '../../../../../../common/search_strategy/security_solution/hosts/risky_hosts';
import { createQueryFilterClauses } from '../../../../../utils/build_query';

export const buildRiskyHostsQuery = ({
  filterQuery,
  timerange: { from, to },
  defaultIndex,
}: HostsRiskyHostsRequestOptions) => {
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

  const dslQuery = {
    index: defaultIndex,
    allowNoIndices: false,
    ignoreUnavailable: true,
    track_total_hits: false,
    body: {
      query: {
        bool: {
          filter,
        },
      },
    },
  };

  return dslQuery;
};
