/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HostsRiskScoreRequestOptions } from '../../../../../../common/search_strategy';

export const buildHostsRiskScoreQuery = ({
  timerange,
  hostNames,
  defaultIndex,
}: HostsRiskScoreRequestOptions) => {
  const filter = [];

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

  if (hostNames) {
    filter.push({ terms: { 'host.name': hostNames } });
  }

  const dslQuery = {
    index: defaultIndex,
    allow_no_indices: false,
    ignore_unavailable: true,
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
