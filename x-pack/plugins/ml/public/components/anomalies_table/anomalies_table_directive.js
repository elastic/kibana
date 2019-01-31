/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import 'ngreact';

import { uiModules } from 'ui/modules';
import { timefilter } from 'ui/timefilter';
import { injectI18nProvider } from '@kbn/i18n/react';
const module = uiModules.get('apps/ml', ['react']);

import { AnomaliesTable } from './anomalies_table';

module.directive('mlAnomaliesTable', function ($injector) {
  const reactDirective = $injector.get('reactDirective');

  return reactDirective(
    injectI18nProvider(AnomaliesTable),
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
