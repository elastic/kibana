/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ngMock from 'ng_mock';
import expect from 'expect.js';
import sinon from 'sinon';

import { TimeseriesChart } from '../components/timeseries_chart/timeseries_chart';

describe('ML - <ml-timeseries-chart>', () => {
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
    // this creates a dummy DOM element with class 'ml-timeseries-chart' as a direct child of
    // the <body> tag so the directive can find it in the DOM to create the resizeChecker.
    const mockClassedElement = document.createElement('div');
    mockClassedElement.classList.add('ml-timeseries-chart');
    document.getElementsByTagName('body')[0].append(mockClassedElement);

    // spy the TimeseriesChart component's unmount method to be able to test if it was called
    const componentWillUnmountSpy = sinon.spy(TimeseriesChart.WrappedComponent.prototype, 'componentWillUnmount');

    $element = $compile('<ml-timeseries-chart show-forecast="true" />')($scope);
    const scope = $element.isolateScope();

    // sanity test to check if directive picked up the attribute for its scope
    expect(scope.showForecast).to.equal(true);

    // componentWillUnmount() should not have been called so far
    expect(componentWillUnmountSpy.callCount).to.equal(0);

    // remove $element to trigger $destroy() callback
    $element.remove();

    // componentWillUnmount() should now have been called once
    expect(componentWillUnmountSpy.callCount).to.equal(1);

    componentWillUnmountSpy.restore();

    // clean up the dummy DOM element
    mockClassedElement.parentNode.removeChild(mockClassedElement);
  });

});
