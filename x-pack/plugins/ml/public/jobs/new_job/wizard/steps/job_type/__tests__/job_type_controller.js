/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import ngMock from 'ng_mock';
import expect from 'expect.js';
import sinon from 'sinon';

// Import this way to be able to stub/mock functions later on in the tests using sinon.
import * as indexUtils from 'plugins/ml/util/index_utils';

describe('ML - Job Type Controller', () => {
  beforeEach(() => {
    ngMock.module('kibana');
  });

  it('Initialize Job Type Controller', (done) => {
    const stub = sinon.stub(indexUtils, 'timeBasedIndexCheck').callsFake(() => false);
    ngMock.inject(function ($rootScope, $controller) {
      const scope = $rootScope.$new();

      // Provide minimal set of locals props required by the controller.
      $controller('MlNewJobStepJobType', {
        $route: {
          current: {
            locals: {
              indexPattern: {
                id: 'test_id',
                title: 'test_pattern'
              },
              savedSearch: {}
            }
          }
        },
        $scope: scope
      });

      expect(scope.indexWarningTitle).to.eql('Index pattern test_pattern is not time based');
      stub.restore();
      done();
    });
  });
});
