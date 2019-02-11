/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore Missing typings for series charts
import { EuiHistogramSeries, EuiSeriesChart, EuiSeriesChartUtils } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { HistogramSeries } from '../../../common/graphql/types';
import { formatHistogramData } from '../../lib/adapters/monitors/format_histogram_data';

interface SnapshotHistogramProps {
  windowWidth: number;
  primaryColor: string;
  dangerColor: string;
  histogram: HistogramSeries[];
}

/**
 * These charts are going to be deprecated. Their responsive feature isn't
 * working with our app, so temporarily we will use this ratio to auto-resize
 * the histogram. When we upgrade the charts we will delete this.
 */
const windowRatio = 0.545238095238095;

export const SnapshotHistogram = ({
  dangerColor,
  histogram,
  primaryColor,
  windowWidth,
}: SnapshotHistogramProps) => {
  const { upSeriesData, downSeriesData } = formatHistogramData(histogram);

  return (
    <EuiSeriesChart
      width={windowWidth * windowRatio}
      height={120}
      stackBy="y"
      xType={EuiSeriesChartUtils.SCALE.TIME}
      xCrosshairFormat="YYYY-MM-DD hh:mmZ"
    >
      <EuiHistogramSeries
        data={upSeriesData}
        name={i18n.translate('xpack.uptime.snapshotHistogram.series.upLabel', {
          defaultMessage: 'Up',
        })}
        color={primaryColor}
      />
      <EuiHistogramSeries
        data={downSeriesData}
        name={i18n.translate('xpack.uptime.snapshotHistogram.series.downLabel', {
          defaultMessage: 'Down',
        })}
        color={dangerColor}
      />
    </EuiSeriesChart>
  );
};
