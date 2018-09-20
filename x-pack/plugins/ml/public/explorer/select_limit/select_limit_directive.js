/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import 'ngreact';

import { stateFactoryProvider } from 'plugins/ml/factories/state_factory';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { SelectLimit } from './select_limit';

module.service('mlSelectLimitService', function (Private) {
  const stateFactory = Private(stateFactoryProvider);
  this.state = stateFactory('mlSelectLimit', {
    limit: 25
  });
})
  .directive('mlSelectLimit', function ($injector) {
    const reactDirective = $injector.get('reactDirective');
    const mlSelectLimitService = $injector.get('mlSelectLimitService');

    return reactDirective(
      SelectLimit,
      undefined,
      { restrict: 'E' },
      { mlSelectLimitService }
    );
  });
