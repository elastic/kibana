/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ngMock from 'ng_mock';
import expect from '@kbn/expect';

import { getTooltips } from '../tooltips';

describe('ML - <ml-info-icon>', () => {
  let $scope;
  let $compile;
  let $element;
  let tooltips;

  before(() => {
    tooltips = getTooltips();
  });

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
    $element = $compile('<ml-info-icon />')($scope);
    const scope = $element.isolateScope();

    expect(scope.id).to.be.an('undefined');
  });

  it('Initialization with a non-existing tooltip attribute doesn\'t throw an error', () => {
    const id = 'non_existing_attribute';
    $element = $compile(`<i ml-info-icon="${id}" />`)($scope);
    const scope = $element.isolateScope();
    scope.$digest();

    expect(scope.id).to.be(id);
  });

  it('Initialize with existing tooltip attribute', () => {
    const id = 'new_job_id';
    $element = $compile(`<i ml-info-icon="${id}" />`)($scope);
    const scope = $element.isolateScope();
    scope.$digest();

    // test scope values
    expect(scope.id).to.be(id);

    // test the rendered span element which should be referenced by aria-describedby
    const span = $element.find('span.ml-info-tooltip-text');
    expect(span[0].id).to.be('ml_aria_description_' + id);
    expect(span.text()).to.be(tooltips[id].text);
  });

});
