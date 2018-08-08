/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import 'ngreact';

import { stateFactoryProvider } from 'plugins/ml/factories/state_factory';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { CheckboxShowCharts } from './checkbox_showcharts';

module.service('mlCheckboxShowChartsService', function (Private) {
  const stateFactory = Private(stateFactoryProvider);
  this.state = stateFactory('mlCheckboxShowCharts', {
    showCharts: true
  });
})
  .directive('mlCheckboxShowCharts', function ($injector) {
    const reactDirective = $injector.get('reactDirective');
    const mlCheckboxShowChartsService = $injector.get('mlCheckboxShowChartsService');

    return reactDirective(
      CheckboxShowCharts,
      undefined,
      { restrict: 'E' },
      { mlCheckboxShowChartsService }
    );
  });
