/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import sinon from 'sinon';
import expect from 'expect.js';
import { estimateBucketSpanFactory } from '../bucket_span_estimator';

// Mock callWithRequest with the ability to simulate returning different
// permission settings. On each call using `ml.privilegeCheck` we retrieve
// the last value from `permissions` and pass that to one of the permission
// settings. The tests call `ml.privilegeCheck` two times, the first time
// sufficient permissions should be returned, the second time insufficient
// permissions.
const permissions = [false, true];
const callWithRequest = (method) => {
  return new Promise((resolve) => {
    if (method === 'ml.privilegeCheck') {
      resolve({
        cluster: {
          'cluster:monitor/xpack/ml/job/get': true,
          'cluster:monitor/xpack/ml/job/stats/get': true,
          'cluster:monitor/xpack/ml/datafeeds/get': true,
          'cluster:monitor/xpack/ml/datafeeds/stats/get': permissions.pop()
        }
      });
      return;
    }
    resolve({});
  });
};

// mock callWithInternalUserFactory
// we replace the return value of the factory with the above mocked callWithRequest
import * as mockModule from '../../../client/call_with_internal_user_factory';

// mock server
function mockServerFactory(isEnabled = false, licenseType = 'platinum') {
  return {
    plugins: {
      xpack_main: {
        info: {
          isAvailable: () => true,
          feature: () => ({
            isEnabled: () => isEnabled
          }),
          license: {
            getType: () => licenseType
          }
        }
      }
    }
  };
}

// mock configuration to be passed to the estimator
const formConfig = {
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
};

describe('ML - BucketSpanEstimator', () => {
  let mockCallWithInternalUserFactory;

  function prepareMock() {
    mockCallWithInternalUserFactory = sinon.mock(mockModule);
    mockCallWithInternalUserFactory
      .expects('callWithInternalUserFactory')
      .once()
      .returns(callWithRequest);
  }

  it('call factory', () => {
    prepareMock();
    expect(function () {
      estimateBucketSpanFactory(callWithRequest);
      mockCallWithInternalUserFactory.verify();
    }).to.not.throwError('Not initialized.');
  });

  it('call factory and estimator with security disabled', (done) => {
    prepareMock();
    expect(function () {
      const estimateBucketSpan = estimateBucketSpanFactory(callWithRequest, mockServerFactory());

      estimateBucketSpan(formConfig).catch((catchData) => {
        expect(catchData).to.be('Unable to retrieve cluster setting search.max_buckets');
        mockCallWithInternalUserFactory.verify();
        done();
      });

    }).to.not.throwError('Not initialized.');
  });

  it('call factory and estimator with security enabled and sufficient permissions.', (done) => {
    prepareMock();
    expect(function () {
      const estimateBucketSpan = estimateBucketSpanFactory(callWithRequest, mockServerFactory(true));

      estimateBucketSpan(formConfig).catch((catchData) => {
        expect(catchData).to.be('Unable to retrieve cluster setting search.max_buckets');
        mockCallWithInternalUserFactory.verify();
        done();
      });

    }).to.not.throwError('Not initialized.');
  });

  it('call factory and estimator with security enabled and insufficient permissions.', (done) => {
    prepareMock();
    expect(function () {
      const estimateBucketSpan = estimateBucketSpanFactory(callWithRequest, mockServerFactory(true));

      estimateBucketSpan(formConfig).catch((catchData) => {
        expect(catchData).to.be('Insufficient permissions to call bucket span estimation.');
        mockCallWithInternalUserFactory.verify();
        done();
      });

    }).to.not.throwError('Not initialized.');
  });

  // The following 2 tests don't test against the final result of the bucket span estimator
  // but instead inspect the payload/body of the search requests when running the estimates.
  // Based on the `search.max_buckets` settings the range queries will have a different
  // `gte` value we can test against. When `search.max_buckets` is `-1`, the duration should
  // fall back to a default value of 10000 buckets.

  // Sunday, February 12, 2017 12:59:54 AM GMT+01:00
  const DURATION_END = 1486857594000;
  // Sunday, February 5, 2017 2:59:54 AM GMT+01:00
  const TEST1_EXPECTED_GTE = 1486259994000;
  // Saturday, February 11, 2017 8:59:54 AM GMT+01:00
  const TEST2_EXPECTED_GTE = 1486799994000;

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
          expect(gte).to.be(TEST1_EXPECTED_GTE);
          done();
          calledDone = true;
        }
        return new Promise((resolve) => {
          const response = (typeof responses[endpoint] !== 'undefined') ? responses[endpoint] : {};
          resolve(response);
        });
      };

      mockCallWithInternalUserFactory = sinon.mock(mockModule);
      mockCallWithInternalUserFactory
        .expects('callWithInternalUserFactory')
        .once()
        .returns(callWithRequestMock);

      const estimateBucketSpan = estimateBucketSpanFactory(callWithRequestMock, mockServerFactory());

      estimateBucketSpan({
        aggTypes: ['count'],
        duration: { start: 0, end: DURATION_END },
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
          expect(gte).to.be(TEST2_EXPECTED_GTE);
          done();
          calledDone = true;
        }
        return new Promise((resolve) => {
          const response = (typeof responses[endpoint] !== 'undefined') ? responses[endpoint] : {};
          resolve(response);
        });
      };

      mockCallWithInternalUserFactory = sinon.mock(mockModule);
      mockCallWithInternalUserFactory
        .expects('callWithInternalUserFactory')
        .once()
        .returns(callWithRequestMock);

      const estimateBucketSpan = estimateBucketSpanFactory(callWithRequestMock, mockServerFactory());

      estimateBucketSpan({
        aggTypes: ['count'],
        duration: { start: 0, end: DURATION_END },
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

  afterEach(() => {
    mockCallWithInternalUserFactory.restore();
  });

});
