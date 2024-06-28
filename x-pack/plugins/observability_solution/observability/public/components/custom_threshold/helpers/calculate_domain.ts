/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { min, max, isNumber } from 'lodash';
import { MetricsExplorerSeries } from '../types';

const getMin = (values: Array<number | null>) => {
  const minValue = min(values);
  return isNumber(minValue) && Number.isFinite(minValue) ? minValue : undefined;
};

const getMax = (values: Array<number | null>) => {
  const maxValue = max(values);
  return isNumber(maxValue) && Number.isFinite(maxValue) ? maxValue : undefined;
};

export const calculateDomain = (series: MetricsExplorerSeries): { min: number; max: number } => {
  const values = series.rows.map((row) => row.metric_0 as number | null).filter((v) => isNumber(v));
  return { min: getMin(values) || 0, max: getMax(values) || 0 };
};
