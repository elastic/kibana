/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import 'ngreact';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { permissionCheckProvider } from 'plugins/ml/privilege/check_privilege';
import { FieldsServiceProvider } from 'plugins/ml/services/fields_service';
import { ForecastingModal } from './forecasting_modal';

module.directive('mlForecastingModal', function ($injector, Private) {
  const forecastService = $injector.get('mlForecastService');
  const jobService = $injector.get('mlJobService');
  const fieldsService = Private(FieldsServiceProvider);
  const timefilter = $injector.get('timefilter');
  const reactDirective = $injector.get('reactDirective');

  const { checkPermission, createPermissionFailureMessage } = Private(permissionCheckProvider);

  return reactDirective(
    ForecastingModal,
    undefined,
    { restrict: 'E' },
    {
      forecastService,
      jobService,
      fieldsService,
      checkPermission,
      createPermissionFailureMessage,
      timefilter
    }
  );
});
