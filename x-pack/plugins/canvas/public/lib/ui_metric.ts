/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UiStatsMetricType, METRIC_TYPE } from '@kbn/analytics';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/public';

export { METRIC_TYPE };

export let reportUiStats: UsageCollectionSetup['reportUiStats'] | undefined;

export function init(_reportUiStats: UsageCollectionSetup['reportUiStats']): void {
  reportUiStats = _reportUiStats;
}

export function trackCanvasUiMetric(metricType: UiStatsMetricType, name: string | string[]) {
  if (!reportUiStats) {
    return;
  }

  reportUiStats('canvas', metricType, name);
}
