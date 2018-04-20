/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import 'ngreact';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { ValidateJob } from './validate_job_view';

module.directive('mlValidateJob', function ($injector) {
  const mlJobService = $injector.get('mlJobService');
  const reactDirective = $injector.get('reactDirective');

  return reactDirective(
    ValidateJob,
    undefined,
    { restrict: 'E' },
    { mlJobService }
  );
});
