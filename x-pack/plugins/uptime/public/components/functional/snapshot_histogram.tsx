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
  histogram: HistogramSeries[];
}

export const SnapshotHistogram = ({ histogram }: SnapshotHistogramProps) => {
  const { upSeriesData, downSeriesData } = formatHistogramData(histogram);

  return (
    <EuiSeriesChart width={600} height={107} stackBy="y" xType={EuiSeriesChartUtils.SCALE.TIME}>
      <EuiHistogramSeries
        data={upSeriesData}
        name={i18n.translate('xpack.uptime.snapshotHistogram.series.upLabel', {
          defaultMessage: 'Up',
        })}
        color="green"
      />
      <EuiHistogramSeries
        data={downSeriesData}
        name={i18n.translate('xpack.uptime.snapshotHistogram.series.downLabel', {
          defaultMessage: 'Down',
        })}
        color="red"
      />
    </EuiSeriesChart>
  );
};
