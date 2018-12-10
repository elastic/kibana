/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import 'ngreact';

import { timefilter } from 'ui/timefilter';
import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { ForecastingModal } from './forecasting_modal';

module.directive('mlForecastingModal', function ($injector) {
  const reactDirective = $injector.get('reactDirective');
  return reactDirective(
    ForecastingModal,
    undefined,
    { restrict: 'E' },
    { timefilter }
  );
});
