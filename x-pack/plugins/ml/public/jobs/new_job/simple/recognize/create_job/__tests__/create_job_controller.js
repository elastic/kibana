/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import ngMock from 'ng_mock';
import expect from 'expect.js';
import sinon from 'sinon';

// Import this way to be able to stub/mock functions later on in the tests using sinon.
import * as newJobUtils from 'plugins/ml/jobs/new_job/utils/new_job_utils';

describe('ML - Recognize Wizard - Create Job Controller', () => {
  beforeEach(() => {
    ngMock.module('kibana');
  });

  it('Initialize Create Job Controller', (done) => {
    const stub = sinon.stub(newJobUtils, 'createSearchItems').callsFake(() => ({
      indexPattern: {},
      savedSearch: {},
      combinedQuery: {}
    }));
    ngMock.inject(function ($rootScope, $controller) {
      const scope = $rootScope.$new();
      $controller('MlCreateRecognizerJobs', {
        $route: {
          current: {
            params: {}
          }
        },
        $scope: scope
      });

      expect(scope.ui.formValid).to.eql(true);
      stub.restore();
      done();
    });
  });
});
