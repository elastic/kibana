/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CtiDataSourceRequestOptions } from '../../../../../../common/search_strategy/security_solution/cti';

export const buildTiDataSourceQuery = ({
  timerange,
  defaultIndex,
}: CtiDataSourceRequestOptions) => {
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

  const dslQuery = {
    size: 0,
    index: defaultIndex,
    allow_no_indices: true,
    ignore_unavailable: true,
    track_total_hits: true,
    body: {
      aggs: {
        dataset: {
          terms: { field: 'event.dataset' },
          aggs: {
            name: {
              terms: { field: 'threat.feed.name' },
            },
            dashboard: {
              terms: {
                field: 'threat.feed.dashboard_id',
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
    },
  };

  return dslQuery;
};
