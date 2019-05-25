/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import sinon from 'sinon';
import expect from '@kbn/expect';
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
  index: '',
  query: {
    bool: {
      must: [{ match_all: {} }],
      must_not: []
    }
  }
};

describe('ML - BucketSpanEstimator', () => {
  let mockCallWithInternalUserFactory;

  beforeEach(() => {
    mockCallWithInternalUserFactory = sinon.mock(mockModule);
    mockCallWithInternalUserFactory
      .expects('callWithInternalUserFactory')
      .once()
      .returns(callWithRequest);
  });

  it('call factory', () => {
    expect(function () {
      estimateBucketSpanFactory(callWithRequest);
      mockCallWithInternalUserFactory.verify();
    }).to.not.throwError('Not initialized.');
  });

  it('call factory and estimator with security disabled', (done) => {
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
    expect(function () {
      const estimateBucketSpan = estimateBucketSpanFactory(callWithRequest, mockServerFactory(true));

      estimateBucketSpan(formConfig).catch((catchData) => {
        expect(catchData).to.be('Insufficient permissions to call bucket span estimation.');
        mockCallWithInternalUserFactory.verify();
        done();
      });

    }).to.not.throwError('Not initialized.');
  });

  afterEach(() => {
    mockCallWithInternalUserFactory.restore();
  });

});
