/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import 'ngreact';

import { stateFactoryProvider } from 'plugins/ml/factories/state_factory';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { SelectInterval, mlSelectIntervalService } from './select_interval';

module.service('mlSelectIntervalService', function (Private, i18n) {
  const stateFactory = Private(stateFactoryProvider);
  this.state = mlSelectIntervalService.state = stateFactory('mlSelectInterval', {
    interval: {
      display: i18n('xpack.ml.controls.selectInterval.autoInitLabel', { defaultMessage: 'Auto' }),
      val: 'auto'
    }
  });
  mlSelectIntervalService.initialized = true;
})
  .directive('mlSelectInterval', function ($injector) {
    const reactDirective = $injector.get('reactDirective');

    return reactDirective(
      SelectInterval,
      undefined,
      { restrict: 'E' }
    );
  });
