/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { last } from 'lodash';
import { MetricsExplorerMetric } from '../../../../../../common/http_api/metrics_explorer';
import { InfraFormatterType } from '../../../../../lib/lib';
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
