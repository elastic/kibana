/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { min, max, sum, isNumber } from 'lodash';
import { MetricsExplorerSeries } from '../../../../common/http_api/metrics_explorer';
import { MetricsExplorerOptionsMetric } from '../../../containers/metrics_explorer/use_metrics_explorer_options';

const getMin = (values: Array<number | null>) => {
  const minValue = min(values);
  return isNumber(minValue) && Number.isFinite(minValue) ? minValue : undefined;
};

const getMax = (values: Array<number | null>) => {
  const maxValue = max(values);
  return isNumber(maxValue) && Number.isFinite(maxValue) ? maxValue : undefined;
};

export const calculateDomain = (
  series: MetricsExplorerSeries,
  metrics: MetricsExplorerOptionsMetric[],
  stacked = false
): { min: number; max: number } => {
  const values = series.rows
    .reduce((acc, row) => {
      const rowValues = metrics
        .map((m, index) => {
          return (row[`metric_${index}`] as number) || null;
        })
        .filter(v => isNumber(v));
      const minValue = getMin(rowValues);
      // For stacked domains we want to add 10% head room so the charts have
      // enough room to draw the 2 pixel line as well.
      const maxValue = stacked ? sum(rowValues) * 1.1 : getMax(rowValues);
      return acc.concat([minValue || null, maxValue || null]);
    }, [] as Array<number | null>)
    .filter(v => isNumber(v));
  return { min: getMin(values) || 0, max: getMax(values) || 0 };
};
