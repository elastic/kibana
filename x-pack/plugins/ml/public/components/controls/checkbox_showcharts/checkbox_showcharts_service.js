/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import 'ngreact';

import { stateFactoryProvider } from 'plugins/ml/factories/state_factory';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { mlCheckboxShowChartsService } from './checkbox_showcharts';

module.service('mlCheckboxShowChartsService', function (Private) {
  const stateFactory = Private(stateFactoryProvider);
  this.state = mlCheckboxShowChartsService.state = stateFactory('mlCheckboxShowCharts', {
    showCharts: true
  });
  mlCheckboxShowChartsService.initialized = true;
});
