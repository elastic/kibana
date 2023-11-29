/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import { CustomThresholdExpressionMetric } from '../../../../common/custom_threshold_rule/types';
import { createFormatter } from '../../../../common/custom_threshold_rule/formatters';
import { metricToFormat } from './metric_to_format';

export const createFormatterForMetric = (metrics: CustomThresholdExpressionMetric[]) => {
  if (metrics.length === 1) {
    const format = metricToFormat(metrics[0]);
    return createFormatter(format);
  }

  return (input: number) => numeral(input).format('0.[0000]');
};
