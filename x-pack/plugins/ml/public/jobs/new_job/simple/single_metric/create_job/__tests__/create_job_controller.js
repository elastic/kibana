/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import ngMock from 'ng_mock';
import expect from '@kbn/expect';
import sinon from 'sinon';

// Import this way to be able to stub/mock functions later on in the tests using sinon.
import * as indexUtils from 'plugins/ml/util/index_utils';

describe('ML - Single Metric Wizard - Create Job Controller', () => {
  beforeEach(() => {
    ngMock.module('kibana');
  });

  it('Initialize Create Job Controller', (done) => {
    const stub = sinon.stub(indexUtils, 'timeBasedIndexCheck').callsFake(() => false);
    ngMock.inject(function ($rootScope, $controller, $route) {
      // Set up the $route current props required for the tests.
      $route.current = {
        locals: {
          indexPattern: {},
          savedSearch: {}
        }
      };

      const scope = $rootScope.$new();

      expect(() => {
        $controller('MlCreateSingleMetricJob', {
          $route: {
            current: {
              params: {}
            }
          },
          $scope: scope
        });
      }).to.not.throwError();

      expect(scope.ui.showJobInput).to.eql(false);
      stub.restore();
      done();
    });
  });
});
