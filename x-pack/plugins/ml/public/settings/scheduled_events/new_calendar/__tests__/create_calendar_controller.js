/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import ngMock from 'ng_mock';
import expect from 'expect.js';

describe('ML - Create Calendar Controller', () => {
  beforeEach(() => {
    ngMock.module('kibana');
  });

  it('Initialize Create Calendar Controller', (done) => {
    ngMock.inject(function ($rootScope, $controller) {
      const scope = $rootScope.$new();

      expect(() => {
        $controller('MlCreateCalendar', {
          $route: {
            current: {
              params: {}
            }
          },
          $scope: scope
        });
      }).to.not.throwError();

      expect(scope.isNewCalendar).to.eql(true);
      done();
    });
  });
});
