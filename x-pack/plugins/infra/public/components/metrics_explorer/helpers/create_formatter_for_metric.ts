/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MetricsExplorerMetric } from '../../../../common/http_api/metrics_explorer';
import { createFormatter } from '../../../utils/formatters';
import { InfraFormatterType } from '../../../lib/lib';
import { metricToFormat } from './metric_to_format';
export const createFormatterForMetric = (metric?: MetricsExplorerMetric) => {
  if (metric && metric.field) {
    const format = metricToFormat(metric);
    if (format === InfraFormatterType.bits && metric.aggregation === 'rate') {
      return createFormatter(InfraFormatterType.bits, '{{value}}/s');
    }
    return createFormatter(format);
  }
  return createFormatter(InfraFormatterType.number);
};
