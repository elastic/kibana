/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { difference, zipObject } from 'lodash';
import { EuiTheme } from '../../../../../src/plugins/kibana_react/common';
import { asTransactionRate } from '../../common/utils/formatters';
import { APIReturnType } from '../services/rest/createCallApmApi';
import { httpStatusCodeToColor } from '../utils/httpStatusCodeToColor';

export type ThroughputChartsResponse = APIReturnType<'GET /api/apm/services/{serviceName}/transactions/charts/throughput'>;

export function getThroughputChartSelector({
  data,
  theme,
}: {
  data?: ThroughputChartsResponse;
  theme: EuiTheme;
}) {
  if (!data) {
    return {
      buckets: [],
      unit: 'minute' as const,
    };
  }

  const bucketKeys = data.buckets.map(({ key }) => key);
  const getColor = getColorByKey(bucketKeys, theme);

  return {
    unit: data.unit,
    buckets: data.buckets.map((bucket) => {
      return {
        title: bucket.key,
        data: bucket.dataPoints,
        legendValue: asTransactionRate(bucket.avg),
        type: 'linemark',
        color: getColor(bucket.key),
      };
    }),
  };
}

function colorMatch(key: string, theme: EuiTheme) {
  if (/ok|success/i.test(key)) {
    return theme.eui.euiColorSecondary;
  } else if (/error|fail/i.test(key)) {
    return theme.eui.euiColorDanger;
  }
}

function getColorByKey(keys: string[], theme: EuiTheme) {
  const assignedColors = ['HTTP 2xx', 'HTTP 3xx', 'HTTP 4xx', 'HTTP 5xx'];

  const unknownKeys = difference(keys, assignedColors);
  const unassignedColors: Record<string, string> = zipObject(unknownKeys, [
    theme.eui.euiColorVis1,
    theme.eui.euiColorVis3,
    theme.eui.euiColorVis4,
    theme.eui.euiColorVis6,
    theme.eui.euiColorVis2,
    theme.eui.euiColorVis8,
  ]);

  return (key: string) =>
    colorMatch(key, theme) ||
    httpStatusCodeToColor(key) ||
    unassignedColors[key];
}
