/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import ngMock from 'ng_mock';
import expect from 'expect.js';

const mockModalInstance = { close: function () { }, dismiss: function () { } };

describe('ML - New Event Modal Controller', () => {
  beforeEach(() => {
    ngMock.module('kibana');
  });

  it('Initialize New Event Modal Controller', (done) => {
    ngMock.inject(function ($rootScope, $controller) {
      const scope = $rootScope.$new();

      expect(() => {
        $controller('MlNewEventModal', {
          $scope: scope,
          $modalInstance: mockModalInstance,
          params: {}
        });
      }).to.not.throwError();

      expect(scope.event.description).to.be('');
      done();
    });
  });
});
