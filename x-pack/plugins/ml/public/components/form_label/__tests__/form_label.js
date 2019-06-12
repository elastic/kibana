/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import ngMock from 'ng_mock';
import expect from '@kbn/expect';

describe('ML - <ml-form-label>', () => {
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

  it('Basic initialization', () => {
    $element = $compile('<ml-form-label />')($scope);
    const scope = $element.isolateScope();
    scope.$digest();

    expect(scope.labelId).to.be.an('undefined');
    expect($element.find('label').text()).to.be('');
  });

  it('Full initialization', () => {
    const labelId = 'uid';
    const labelText = 'Label Text';
    $element = $compile(`
      <ml-form-label label-id="${labelId}">${labelText}</ml-form-label>
    `)($scope);
    const scope = $element.isolateScope();
    scope.$digest();

    const labelElement = $element.find('label');
    expect(labelElement[0].attributes.id.value).to.be('ml_aria_label_' + labelId);
    expect(labelElement.text()).to.be(labelText);
  });

});
