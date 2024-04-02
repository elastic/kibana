/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { createFormatter } from './formatters';
export const NO_DATA = '[NO DATA]';
export const metricValueFormatter = (value: number | null, metric: string = '') => {
  const noDataValue = i18n.translate(
    'xpack.observability.customThreshold.rule.alerting.noDataFormattedValue',
    {
      defaultMessage: String(NO_DATA),
    }
  );

  let formatter = createFormatter('highPrecision');
  if (metric.endsWith('.pct')) formatter = createFormatter('percent');
  if (metric.endsWith('.bytes')) formatter = createFormatter('bytes');

  return value == null ? noDataValue : formatter(value);
};
