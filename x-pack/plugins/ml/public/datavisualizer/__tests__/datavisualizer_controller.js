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

describe('ML - Data Visualizer View Fields Controller', () => {


  beforeEach(() => {
    ngMock.module('kibana');
  });

  it('Initialize Data Visualizer View Fields Controller', (done) => {
    const stub = sinon.stub(indexUtils, 'timeBasedIndexCheck').callsFake(() => false);
    ngMock.inject(function ($rootScope, $controller, $route) {
      // Set up the $route current props required for the tests.
      $route.current = {
        locals: {
          indexPattern: {
            id: ''
          },
          savedSearch: {
            id: ''
          }
        }
      };

      const scope = $rootScope.$new();

      expect(() => {
        $controller('MlDataVisualizerViewFields', { $scope: scope });
      }).to.not.throwError();

      expect(scope.metricCards).to.eql([]);
      stub.restore();
      done();
    });
  });
});
