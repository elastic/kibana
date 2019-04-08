/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import ngMock from 'ng_mock';
import expect from 'expect.js';

describe('ML - Angular Bootstrap Patch - Dropdown Controller', () => {
  beforeEach(() => {
    ngMock.module('ui.bootstrap.dropdown');
  });

  it('Initialize Dropdown Controller', (done) => {
    ngMock.inject(function ($rootScope, $controller) {
      const scope = $rootScope.$new();

      expect(scope.$$watchersCount).to.eql(0);

      expect(() => {
        $controller('DropdownController', {
          $attrs: [],
          $scope: scope
        });
      }).to.not.throwError();

      expect(scope.$$watchersCount).to.eql(1);
      done();
    });
  });
});
