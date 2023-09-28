/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StorageGroupedIndexNames } from '../../../../common/storage_explorer';

export function getGroupedIndexLabel(label: StorageGroupedIndexNames) {
  switch (label) {
    case 'events':
      return i18n.translate('xpack.profiling.storageExplorer.dataBreakdown.chart.samples', {
        defaultMessage: 'Samples',
      });
    case 'executables':
      return i18n.translate('xpack.profiling.storageExplorer.dataBreakdown.chart.executables', {
        defaultMessage: 'Executables',
      });
    case 'metrics':
      return i18n.translate('xpack.profiling.storageExplorer.dataBreakdown.chart.metrics', {
        defaultMessage: 'Metrics',
      });
    case 'stackframes':
      return i18n.translate('xpack.profiling.storageExplorer.dataBreakdown.chart.stackframes', {
        defaultMessage: 'Stackframes',
      });
    case 'stacktraces':
      return i18n.translate('xpack.profiling.storageExplorer.dataBreakdown.chart.stacktraces', {
        defaultMessage: 'Stacktraces',
      });
  }
}
