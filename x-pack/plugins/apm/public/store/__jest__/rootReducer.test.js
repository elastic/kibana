/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import reducer from '../rootReducer';

describe('root reducer', () => {
  it('should return the initial state', () => {
    expect(reducer(undefined, {})).toEqual({
      detailsCharts: {
        data: {
          dates: [],
          responseTimes: {},
          totalHits: 0,
          tpmBuckets: [],
          weightedAverage: null
        }
      },
      overviewCharts: {
        data: {
          dates: [],
          responseTimes: {},
          totalHits: 0,
          tpmBuckets: [],
          weightedAverage: null
        }
      },
      errorDistribution: { data: { buckets: [], totalHits: 0 } },
      errorGroup: { data: {} },
      errorGroupList: { data: [] },
      license: {
        data: {
          features: { watcher: { isAvailable: false } },
          license: { isActive: false }
        }
      },
      location: { hash: '', pathname: '', search: '' },
      service: { data: { types: [] } },
      serviceList: { data: [] },
      sorting: {
        service: { descending: false, key: 'serviceName' },
        transaction: { descending: true, key: 'impact' }
      },
      spans: { data: {} },
      transaction: { data: {} },
      transactionDistribution: { data: { buckets: [], totalHits: 0 } },
      transactionList: { data: [] },
      urlParams: {}
    });
  });

  it('should return incoming data as state', () => {
    expect(
      reducer({ errorGroupList: { data: ['a', 'b'] } }, {}).errorGroupList
    ).toMatchSnapshot();
  });

  it('should return default data as state', () => {
    expect(reducer(undefined, {}).errorGroupList).toMatchSnapshot();
  });
});
