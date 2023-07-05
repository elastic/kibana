/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { last } from 'lodash';
import { InfraFormatterType } from '../../../../common/threshold_rule/types';
import { MetricsExplorerMetric } from '../../../../common/threshold_rule/metrics_explorer';

export const metricToFormat = (metric?: MetricsExplorerMetric) => {
  if (metric && metric.field) {
    const suffix = last(metric.field.split(/\./));
    if (suffix === 'pct') {
      return InfraFormatterType.percent;
    }
    if (suffix === 'bytes' && metric.aggregation === 'rate') {
      return InfraFormatterType.bits;
    }
    if (suffix === 'bytes') {
      return InfraFormatterType.bytes;
    }
  }
  return InfraFormatterType.number;
};
