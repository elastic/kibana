/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import ngMock from 'ng_mock';
import expect from 'expect.js';


describe('ML - Recognize Wizard - Create Job Controller', () => {
  beforeEach(() => {
    ngMock.module('kibana');
  });

  it('Initialize Create Job Controller', (done) => {
    ngMock.inject(function ($rootScope, $controller) {
      const scope = $rootScope.$new();
      $controller('MlCreateRecognizerJobs', {
        $route: {
          current: {
            locals: {
              indexPattern: {},
              savedSearch: {}
            },
            params: {}
          }
        },
        $scope: scope
      });

      expect(scope.ui.formValid).to.eql(true);
      done();
    });
  });
});
