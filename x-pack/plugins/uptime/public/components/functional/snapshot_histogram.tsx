/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore Missing typings for series charts
import { EuiHistogramSeries, EuiSeriesChart, EuiSeriesChartUtils } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { HistogramDataPoint } from '../../../common/graphql/types';

export interface SnapshotHistogramProps {
  successColor: string;
  dangerColor: string;
  histogram: HistogramDataPoint[];
}

/**
 * These charts are going to be deprecated. Their responsive feature isn't
 * working with our app, so temporarily we will use this ratio to auto-resize
 * the histogram. When we upgrade the charts we will delete this.
 */

export const SnapshotHistogram = ({
  dangerColor,
  histogram,
  successColor,
}: SnapshotHistogramProps) => (
  <EuiSeriesChart
    height={120}
    stackBy="y"
    xType={EuiSeriesChartUtils.SCALE.TIME}
    xCrosshairFormat="YYYY-MM-DD hh:mmZ"
    animateData={false}
  >
    <EuiHistogramSeries
      data={histogram.map(({ x, x0, downCount }) => ({ x, x0, y: downCount || 0 }))}
      name={i18n.translate('xpack.uptime.snapshotHistogram.series.downLabel', {
        defaultMessage: 'Down',
      })}
      color={dangerColor}
    />
    <EuiHistogramSeries
      data={histogram.map(({ x, x0, upCount }) => ({ x, x0, y: upCount || 0 }))}
      name={i18n.translate('xpack.uptime.snapshotHistogram.series.upLabel', {
        defaultMessage: 'Up',
      })}
      color={successColor}
    />
  </EuiSeriesChart>
);
