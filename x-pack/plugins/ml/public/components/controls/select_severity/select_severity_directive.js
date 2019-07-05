/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import 'ngreact';

import { wrapInI18nContext } from 'ui/i18n';
import { stateFactoryProvider } from 'plugins/ml/factories/state_factory';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { SelectSeverity, mlSelectSeverityService } from './select_severity';

module.service('mlSelectSeverityService', function (Private, i18n) {
  const stateFactory = Private(stateFactoryProvider);
  this.state = mlSelectSeverityService.state = stateFactory('mlSelectSeverity', {
    threshold: {
      display: i18n('xpack.ml.controls.selectSeverity.threshold.warningLabel', { defaultMessage: 'warning' }),
      val: 0
    }
  });
  mlSelectSeverityService.intialized = true;
})
  .directive('mlSelectSeverity', function ($injector) {
    const reactDirective = $injector.get('reactDirective');

    return reactDirective(
      wrapInI18nContext(SelectSeverity),
      undefined,
      { restrict: 'E' },
    );
  });
