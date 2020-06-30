/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from 'kibana/server';

import { ES_AGGREGATION } from '../../../common/constants/aggregation_types';

import { estimateBucketSpanFactory, BucketSpanEstimatorData } from './bucket_span_estimator';

// Mock callWithRequest with the ability to simulate returning different
// permission settings. On each call using `ml.privilegeCheck` we retrieve
// the last value from `permissions` and pass that to one of the permission
// settings. The tests call `ml.privilegeCheck` two times, the first time
// sufficient permissions should be returned, the second time insufficient
// permissions.
const permissions = [false, true];
const callWithRequest: LegacyAPICaller = (method: string) => {
  return new Promise((resolve) => {
    if (method === 'ml.privilegeCheck') {
      resolve({
        cluster: {
          'cluster:monitor/xpack/ml/job/get': true,
          'cluster:monitor/xpack/ml/job/stats/get': true,
          'cluster:monitor/xpack/ml/datafeeds/get': true,
          'cluster:monitor/xpack/ml/datafeeds/stats/get': permissions.pop(),
        },
      });
      return;
    }
    resolve({});
  }) as Promise<any>;
};

const callWithInternalUser: LegacyAPICaller = () => {
  return new Promise((resolve) => {
    resolve({});
  }) as Promise<any>;
};

// mock configuration to be passed to the estimator
const formConfig: BucketSpanEstimatorData = {
  aggTypes: [ES_AGGREGATION.COUNT],
  duration: { start: 0, end: 1 },
  fields: [null],
  index: '',
  query: {
    bool: {
      must: [{ match_all: {} }],
      must_not: [],
    },
  },
  splitField: undefined,
  timeField: undefined,
};

describe('ML - BucketSpanEstimator', () => {
  it('call factory', () => {
    expect(function () {
      estimateBucketSpanFactory(callWithRequest, callWithInternalUser, false);
    }).not.toThrow('Not initialized.');
  });

  it('call factory and estimator with security disabled', (done) => {
    expect(function () {
      const estimateBucketSpan = estimateBucketSpanFactory(
        callWithRequest,
        callWithInternalUser,
        true
      );

      estimateBucketSpan(formConfig).catch((catchData) => {
        expect(catchData).toBe('Unable to retrieve cluster setting search.max_buckets');

        done();
      });
    }).not.toThrow('Not initialized.');
  });

  it('call factory and estimator with security enabled.', (done) => {
    expect(function () {
      const estimateBucketSpan = estimateBucketSpanFactory(
        callWithRequest,
        callWithInternalUser,
        false
      );
      estimateBucketSpan(formConfig).catch((catchData) => {
        expect(catchData).toBe('Unable to retrieve cluster setting search.max_buckets');

        done();
      });
    }).not.toThrow('Not initialized.');
  });
});
