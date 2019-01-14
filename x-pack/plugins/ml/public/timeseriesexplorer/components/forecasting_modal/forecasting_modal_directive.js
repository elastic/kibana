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

import { injectI18nProvider } from '@kbn/i18n/react';

module.directive('mlForecastingModal', function ($injector) {
  const reactDirective = $injector.get('reactDirective');
  return reactDirective(
    injectI18nProvider(ForecastingModal),
    // reactDirective service requires for react component to have propTypes, but injectI18n doesn't copy propTypes from wrapped component.
    // That's why we pass propTypes directly to reactDirective service.
    Object.keys(ForecastingModal.WrappedComponent.propTypes || {}),
    { restrict: 'E' },
    { timefilter }
  );
});
