/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import expect from 'expect.js';
import { estimateBucketSpanFactory } from '../bucket_span_estimator';

// mock callWithRequest
const callWithRequest = () => {
  return new Promise((resolve) => {
    resolve({});
  });
};

describe('ML - BucketSpanEstimator', () => {
  it('call factory', () => {
    expect(function () {
      estimateBucketSpanFactory(callWithRequest);
    }).to.not.throwError('Not initialized.');
  });

  it('call factory and estimator', (done) => {
    expect(function () {
      const estimateBucketSpan = estimateBucketSpanFactory(callWithRequest);

      estimateBucketSpan({
        aggTypes: ['count'],
        duration: {},
        fields: [null],
        filters: [],
        index: '',
        query: {
          bool: {
            must: [{ query_string: { analyze_wildcard: true, query: '*' } }],
            must_not: []
          }
        }
      }).catch((catchData) => {
        expect(catchData).to.be('BucketSpanEstimator: run has stopped because no checks returned a valid interval');
        done();
      });

    }).to.not.throwError('Not initialized.');
  });

});
