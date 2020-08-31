/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILegacyScopedClusterClient } from 'kibana/server';

import { ES_AGGREGATION } from '../../../common/constants/aggregation_types';

import { estimateBucketSpanFactory, BucketSpanEstimatorData } from './bucket_span_estimator';

const callAs = () => {
  return new Promise((resolve) => {
    resolve({});
  }) as Promise<any>;
};

const mlClusterClient: ILegacyScopedClusterClient = {
  callAsCurrentUser: callAs,
  callAsInternalUser: callAs,
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
      estimateBucketSpanFactory(mlClusterClient);
    }).not.toThrow('Not initialized.');
  });

  it('call factory and estimator with security disabled', (done) => {
    expect(function () {
      const estimateBucketSpan = estimateBucketSpanFactory(mlClusterClient);

      estimateBucketSpan(formConfig).catch((catchData) => {
        expect(catchData).toBe('Unable to retrieve cluster setting search.max_buckets');

        done();
      });
    }).not.toThrow('Not initialized.');
  });

  it('call factory and estimator with security enabled.', (done) => {
    expect(function () {
      const estimateBucketSpan = estimateBucketSpanFactory(mlClusterClient);
      estimateBucketSpan(formConfig).catch((catchData) => {
        expect(catchData).toBe('Unable to retrieve cluster setting search.max_buckets');

        done();
      });
    }).not.toThrow('Not initialized.');
  });
});
