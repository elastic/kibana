/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import ngMock from 'ng_mock';
import expect from '@kbn/expect';

describe('ML - Message Bar Controller', () => {
  beforeEach(() => {
    ngMock.module('kibana');
  });

  it('Initialize Message Bar Controller', (done) => {
    ngMock.inject(function ($rootScope, $controller) {
      const scope = $rootScope.$new();

      expect(() => {
        $controller('MlMessageBarController', { $scope: scope });
      }).to.not.throwError();

      expect(scope.messages).to.eql([]);
      done();
    });
  });
});
