/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import ngMock from 'ng_mock';
import expect from 'expect.js';

const mockModalInstance = { close: function () {}, dismiss: function () {} };

describe('ML - Confirm Modal Controller', () => {
  beforeEach(() => {
    ngMock.module('kibana');
  });

  it('Initialize Confirm Modal Controller', (done) => {
    ngMock.inject(function ($rootScope, $controller) {
      const scope = $rootScope.$new();

      expect(() => {
        $controller('MlConfirmModal', {
          $scope: scope,
          $modalInstance: mockModalInstance,
          params: {}
        });
      }).to.not.throwError();

      expect(scope.okLabel).to.be('OK');
      done();
    });
  });
});
