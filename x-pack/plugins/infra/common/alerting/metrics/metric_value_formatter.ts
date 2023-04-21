/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { createFormatter } from '../../formatters';

export const metricValueFormatter = (value: number | null, metric: string = '') => {
  const noDataValue = i18n.translate('xpack.infra.metrics.alerting.noDataFormattedValue', {
    defaultMessage: '[NO DATA]',
  });

  let formatter;
  if (metric.endsWith('.pct')) {
    formatter = createFormatter('percent');
  } else {
    formatter = createFormatter('highPrecision');
  }

  return value !== null && value !== undefined ? formatter(value) : noDataValue;
};
