/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { NonEmptyString } from '@kbn/io-ts-utils';
import { Color } from '../color_palette';
import {
  MetricsExplorerChartType,
  MetricsExplorerViewAttributes,
  MetricsExplorerYAxisMode,
} from './types';

export const staticMetricsExplorerViewId = '0';

export const staticMetricsExplorerViewAttributes: MetricsExplorerViewAttributes = {
  name: i18n.translate('xpack.infra.savedView.defaultViewNameHosts', {
    defaultMessage: 'Default view',
  }) as NonEmptyString,
  isDefault: false,
  isStatic: true,
  options: {
    aggregation: 'avg',
    metrics: [
      {
        aggregation: 'avg',
        field: 'system.cpu.total.norm.pct',
        color: Color.color0,
      },
      {
        aggregation: 'avg',
        field: 'kubernetes.pod.cpu.usage.node.pct',
        color: Color.color1,
      },
      {
        aggregation: 'avg',
        field: 'docker.cpu.total.pct',
        color: Color.color2,
      },
    ],
    source: 'default',
  },
  chartOptions: {
    type: MetricsExplorerChartType.line,
    yAxisMode: MetricsExplorerYAxisMode.fromZero,
    stack: false,
  },
  currentTimerange: {
    from: 'now-1h',
    to: 'now',
    interval: '>=10s',
  },
};
