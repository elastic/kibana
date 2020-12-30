/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UiCounterMetricType, METRIC_TYPE } from '@kbn/analytics';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/public';

export { METRIC_TYPE };

export let reportUiCounter: UsageCollectionSetup['reportUiCounter'] | undefined;

export function init(_reportUiCounter: UsageCollectionSetup['reportUiCounter']): void {
  reportUiCounter = _reportUiCounter;
}

export function trackCanvasUiMetric(metricType: UiCounterMetricType, name: string | string[]) {
  if (!reportUiCounter) {
    return;
  }

  reportUiCounter('canvas', metricType, name);
}
