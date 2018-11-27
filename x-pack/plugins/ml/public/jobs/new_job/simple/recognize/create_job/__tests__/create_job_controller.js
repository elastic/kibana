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
        $controller('MlCreateRecognizerJobs', {
          $route: {
            current: {
              params: {}
            }
          },
          $scope: scope
        });
      }).to.not.throwError();

      expect(scope.ui.formValid).to.eql(true);
      done();
    });
  });
});
