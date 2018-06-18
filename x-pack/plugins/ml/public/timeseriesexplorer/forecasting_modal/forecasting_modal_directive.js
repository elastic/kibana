/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import 'ngreact';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { ForecastingModal } from './forecasting_modal';

module.directive('mlForecastingModal', function ($injector) {
  const timefilter = $injector.get('timefilter');
  const reactDirective = $injector.get('reactDirective');
  return reactDirective(
    ForecastingModal,
    undefined,
    { restrict: 'E' },
    { timefilter }
  );
});
