/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import 'ngreact';

import { stateFactoryProvider } from 'plugins/ml/factories/state_factory';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { SelectSeverity } from './select_severity';

module.service('mlSelectSeverityService', function (Private) {
  const stateFactory = Private(stateFactoryProvider);
  this.state = stateFactory('mlSelectSeverity', {
    threshold: { display: 'warning', val: 0 }
  });
})
  .directive('mlSelectSeverity', function ($injector) {
    const reactDirective = $injector.get('reactDirective');
    const mlSelectSeverityService = $injector.get('mlSelectSeverityService');

    return reactDirective(
      SelectSeverity,
      undefined,
      { restrict: 'E' },
      { mlSelectSeverityService }
    );
  });
