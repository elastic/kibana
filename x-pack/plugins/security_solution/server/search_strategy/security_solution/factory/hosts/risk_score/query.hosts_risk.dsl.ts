/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HostsRiskScoreRequestOptions } from '../../../../../../common';

export const buildHostsRiskScoreQuery = ({
  timerange,
  hostName,
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

  if (hostName) {
    filter.push({ term: { 'host.name': hostName } });
  }

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
