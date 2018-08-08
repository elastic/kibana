/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import ngMock from 'ng_mock';
import expect from 'expect.js';

describe('ML - <ml-controls-select>', () => {
  let $scope;
  let $compile;
  let $element;

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

  it('Plain initialization doesn\'t throw an error', () => {
    $element = $compile('<ml-controls-select />')($scope);
    const scope = $element.isolateScope();

    expect(scope.identifier).to.be.an('undefined');
    expect(scope.label).to.be.an('undefined');
    expect(scope.options).to.be.an('undefined');
    expect(scope.selected).to.be.an('undefined');
    expect(scope.setOption).to.be.a('function');
    expect(scope.showIcons).to.be.an('undefined');
    expect(scope.updateFn).to.be.a('undefined');
  });

  it('Initialize with attributes, call pass-through function', (done) => {
    $scope.intervalOptions = [
      { display: 'testOptionLabel1', val: 'testOptionValue1' },
      { display: 'testOptionLabel2', val: 'testOptionValue2' }
    ];
    $scope.selectedOption = $scope.intervalOptions[1];

    $scope.testUpdateFn = function () {
      done();
    };

    $element = $compile(`
      <ml-controls-select
        identifier="testIdentifier"
        label="testLabel"
        options="intervalOptions"
        selected="selectedOption"
        show-icons="false"
        update-fn="testUpdateFn"
      />
    `)($scope);

    const scope = $element.isolateScope();

    expect(scope.identifier).to.be('testIdentifier');
    expect(scope.label).to.be('testLabel');
    expect(scope.options).to.equal($scope.intervalOptions);
    expect(scope.selected).to.equal($scope.selectedOption);
    expect(scope.setOption).to.be.a('function');
    expect(scope.showIcons).to.be.false;
    expect(scope.updateFn).to.be.a('function');

    // this should call the function passed through ($scope.testUpdateFn)
    // which in return calls done() to finish the test
    scope.setOption();
  });

});
