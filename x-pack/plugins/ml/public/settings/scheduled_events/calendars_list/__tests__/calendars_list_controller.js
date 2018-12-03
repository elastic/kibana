/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import ngMock from 'ng_mock';
import expect from 'expect.js';

describe('ML - Calendars List Controller', () => {
  beforeEach(() => {
    ngMock.module('kibana');
  });

  it('Initialize Calendars List Controller', (done) => {
    ngMock.inject(function ($rootScope, $controller) {
      const scope = $rootScope.$new();

      expect(() => {
        $controller('MlCalendarsList', { $scope: scope });
      }).to.not.throwError();

      expect(scope.permissions.canCreateCalendar).to.eql(false);
      done();
    });
  });
});
