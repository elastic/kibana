/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import 'ngreact';

import { wrapInI18nContext } from 'ui/i18n';
import { uiModules } from 'ui/modules';
import { timefilter } from 'ui/timefilter';
const module = uiModules.get('apps/ml', ['react']);

import { AnomaliesTable } from './anomalies_table';

module.directive('mlAnomaliesTable', function ($injector) {
  const reactDirective = $injector.get('reactDirective');

  return reactDirective(
    wrapInI18nContext(AnomaliesTable),
    [
      ['filter', { watchDepth: 'reference' }],
      ['tableData', { watchDepth: 'reference' }]
    ],
    { restrict: 'E' },
    {
      timefilter
    }
  );
});
