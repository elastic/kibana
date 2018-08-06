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
        expect(catchData).to.be('Unable to retrieve cluster setting search.max_buckets');
        done();
      });

    }).to.not.throwError('Not initialized.');
  });

  // The following 2 tests don't test against the final result of the bucket span estimator
  // but instead inspect the payload/body of the search requests when running the estimates.
  // Based on the `search.max_buckets` settings the range queries will have a different
  // `gte` value we can test against. When `search.max_buckets` is `-1`, the duration should
  // fall back to a default value of 10000 buckets.
  it('call factory with mock max buckets response of -1', (done) => {
    expect(function () {
      let calledDone = false;
      const responses = {
        'cluster.getSettings': {
          defaults: { 'search.max_buckets': '-1' }
        }
      };

      const callWithRequestMock = (endpoint, payload) => {
        if (endpoint === 'search' && calledDone === false) {
          const gte = payload.body.query.bool.must[1].range.undefined.gte;
          expect(gte).to.be(1486259994000);
          done();
          calledDone = true;
        }
        return new Promise((resolve) => {
          const response = (typeof responses[endpoint] !== 'undefined') ? responses[endpoint] : {};
          resolve(response);
        });
      };

      const estimateBucketSpan = estimateBucketSpanFactory(callWithRequestMock);

      estimateBucketSpan({
        aggTypes: ['count'],
        duration: { start: 0, end: 1486857594000 },
        fields: [null],
        filters: [],
        index: '',
        query: {
          bool: {
            must: [{ query_string: { analyze_wildcard: true, query: '*' } }],
            must_not: []
          }
        }
      }).catch(() => {});

    }).to.not.throwError('Not initialized.');
  });

  it('call factory with mock max buckets response of 1000', (done) => {
    expect(function () {
      let calledDone = false;
      const responses = {
        'cluster.getSettings': {
          defaults: { 'search.max_buckets': '1000' }
        }
      };

      const callWithRequestMock = (endpoint, payload) => {
        if (endpoint === 'search' && calledDone === false) {
          const gte = payload.body.query.bool.must[1].range.undefined.gte;
          expect(gte).to.be(1486799994000);
          done();
          calledDone = true;
        }
        return new Promise((resolve) => {
          const response = (typeof responses[endpoint] !== 'undefined') ? responses[endpoint] : {};
          resolve(response);
        });
      };

      const estimateBucketSpan = estimateBucketSpanFactory(callWithRequestMock);

      estimateBucketSpan({
        aggTypes: ['count'],
        duration: { start: 0, end: 1486857594000 },
        fields: [null],
        filters: [],
        index: '',
        query: {
          bool: {
            must: [{ query_string: { analyze_wildcard: true, query: '*' } }],
            must_not: []
          }
        }
      }).catch(() => {});

    }).to.not.throwError('Not initialized.');
  });
});
