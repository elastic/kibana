/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import sinon from 'sinon';
import expect from 'expect.js';
import { estimateBucketSpanFactory } from '../bucket_span_estimator';

// mock callWithRequest
const callWithRequest = () => {
  return new Promise((resolve) => {
    resolve({});
  });
};

// mock callWithInternalUserFactory
// we replace the return value of the factory with the above mocked callWithRequest
import * as mockModule from '../../../client/call_with_internal_user_factory';
sinon.mock(mockModule)
  .expects('callWithInternalUserFactory')
  .once()
  .returns(callWithRequest);

// mock server
const mockServer = {
  plugins: {
    xpack_main: {
      info: {
        isAvailable: () => true,
        feature: () => ({
          isEnabled: () => false
        })
      }
    }
  }
};

describe('ML - BucketSpanEstimator', () => {
  it('call factory', () => {
    expect(function () {
      estimateBucketSpanFactory(callWithRequest);
    }).to.not.throwError('Not initialized.');
  });

  it('call factory and estimator', (done) => {
    expect(function () {
      const estimateBucketSpan = estimateBucketSpanFactory(callWithRequest, mockServer);

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

});
