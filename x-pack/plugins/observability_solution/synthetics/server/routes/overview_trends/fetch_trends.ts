/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EXCLUDE_RUN_ONCE_FILTER, SUMMARY_FILTER } from '../../../common/constants/client_defaults';
import { createEsParams } from '../../lib';

export const getFetchTrendsQuery = (configId: string, locationIds: string[], interval: number) =>
  createEsParams({
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            SUMMARY_FILTER,
            EXCLUDE_RUN_ONCE_FILTER,
            {
              terms: {
                'observer.name': locationIds,
              },
            },
            {
              term: {
                config_id: configId,
              },
            },
            {
              range: {
                '@timestamp': {
                  gte: `now-${interval}m`,
                  lte: 'now',
                },
              },
            },
          ],
        },
      },
      aggs: {
        byId: {
          terms: {
            field: 'config_id',
          },
          aggs: {
            byLocation: {
              terms: {
                field: 'observer.name',
              },
              aggs: {
                last50: {
                  histogram: {
                    field: '@timestamp',
                    interval: interval * 1000,
                    min_doc_count: 1,
                  },
                  aggs: {
                    max: {
                      avg: {
                        field: 'monitor.duration.us',
                      },
                    },
                  },
                },
                stats: {
                  stats: {
                    field: 'monitor.duration.us',
                  },
                },
                median: {
                  percentiles: {
                    field: 'monitor.duration.us',
                    percents: [50],
                  },
                },
              },
            },
          },
        },
      },
      _source: false,
      sort: [
        {
          '@timestamp': 'desc',
        },
      ],
      fields: ['monitor.duration.us'],
    },
  });

export type TrendsQuery = ReturnType<typeof getFetchTrendsQuery>;
