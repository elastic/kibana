/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import ngMock from 'ng_mock';
import expect from 'expect.js';

describe('ML - <ml-select-interval>', () => {
  let $scope;
  let $compile;

  beforeEach(ngMock.module('kibana'));
  beforeEach(() => {
    ngMock.inject(function ($injector) {
      $compile = $injector.get('$compile');
      const $rootScope = $injector.get('$rootScope');
      $scope = $rootScope.$new();
    });
  });

  afterEach(() => {
    $scope.$destroy();
  });

  it('Initialization doesn\'t throw an error', () => {
    expect(function () {
      $compile('<ml-select-interval />')($scope);
    }).to.not.throwError('Not initialized.');

    expect($scope.setInterval).to.be.a('function');
    expect($scope.interval).to.eql({ display: 'Auto', val: 'auto' });
    expect($scope.intervalOptions).to.eql([
      { display: 'Auto', val: 'auto' },
      { display: '1 hour', val: 'hour' },
      { display: '1 day', val: 'day' },
      { display: 'Show all', val: 'second' }
    ]);
  });

});
