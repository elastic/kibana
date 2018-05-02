/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import ngMock from 'ng_mock';
import expect from 'expect.js';

describe('ML - <ml-select-severity>', () => {
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
      $compile('<ml-select-severity />')($scope);
    }).to.not.throwError('Not initialized.');

    expect($scope.setThreshold).to.be.a('function');
    expect($scope.threshold).to.eql({ display: 'warning', val: 0 });
    expect($scope.thresholdOptions).to.eql([
      { display: 'critical', val: 75 },
      { display: 'major', val: 50 },
      { display: 'minor', val: 25 },
      { display: 'warning', val: 0 }
    ]);
  });

});
