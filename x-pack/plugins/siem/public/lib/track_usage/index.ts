/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { trackUiMetric } from '../../../../../../src/legacy/core_plugins/ui_metric/public';

const APP_NAME = 'siem';

export function trackUiAction(metricType) {
  trackUiMetric(APP_NAME, metricType);
}
