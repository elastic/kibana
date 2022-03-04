/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildTiDataSourceQuery } from './query.threat_intel_source.dsl';
import { CtiQueries } from '../../../../../../common/search_strategy/security_solution/cti';

export const mockOptions = {
  defaultIndex: ['logs-ti_*', 'filebeat-8*'],
  docValueFields: [],
  factoryQueryType: CtiQueries.dataSource,
  filterQuery: '',
  timerange: {
    interval: '12h',
    from: '2020-09-06T15:23:52.757Z',
    to: '2020-09-07T15:23:52.757Z',
  },
};

export const expectedDsl = {
  body: {
    aggs: {
      dataset: {
        terms: {
          field: 'event.dataset',
        },
        aggs: {
          name: {
            terms: {
              field: 'threat.feed.name',
            },
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
        filter: [
          {
            range: {
              '@timestamp': {
                gte: '2020-09-06T15:23:52.757Z',
                lte: '2020-09-07T15:23:52.757Z',
                format: 'strict_date_optional_time',
              },
            },
          },
        ],
      },
    },
  },
  ignore_unavailable: true,
  index: ['logs-ti_*', 'filebeat-8*'],
  size: 0,
  track_total_hits: true,
  allow_no_indices: true,
};

describe('buildbuildTiDataSourceQueryQuery', () => {
  test('build query from options correctly', () => {
    expect(buildTiDataSourceQuery(mockOptions)).toEqual(expectedDsl);
  });
});
