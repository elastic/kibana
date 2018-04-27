/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick } from 'lodash';

export function serializeMetric(metric) {
  // some fields exposed for debugging through HTML comment text
  const pickFields = [
    'app',
    'field',
    'metricAgg',
    'label',
    'title',
    'description',
    'units',
    'format'
  ];

  return {
    ...pick(metric, pickFields),
    hasCalculation: Boolean(metric.calculation),
    isDerivative: metric.derivative,
  };
}
