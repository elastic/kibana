/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import ngMock from 'ng_mock';
import expect from 'expect.js';

describe('ML - <ml-select-limit>', () => {
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
      $compile('<ml-select-limit />')($scope);
    }).to.not.throwError('Not initialized.');

    expect($scope.setLimit).to.be.a('function');
    expect($scope.limit).to.eql({ display: '10', val: 10 });
    expect($scope.limitOptions).to.eql([
      { display: '5', val: 5 },
      { display: '10', val: 10 },
      { display: '25', val: 25 },
      { display: '50', val: 50 }
    ]);
  });

});
