/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore missing type definition
import { EuiHistogramSeries, EuiSeriesChart, EuiSeriesChartUtils } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { LatestMonitor, MonitorSeriesPoint } from '../../../common/graphql/types';
import { formatSparklineCounts } from './format_sparkline_counts';

export interface MonitorSparklineProps {
  dangerColor: string;
  monitor: LatestMonitor;
}

const seriesHasCounts = (series: MonitorSeriesPoint[]) => {
  return series.some(point => !!point.y);
};

/**
 * There is a specific focus on the monitor's down count, the up series is not shown,
 * so we will only render the series component if there are down counts for the selected monitor.
 * @param props - the values for the monitor this sparkline reflects
 */
export const MonitorSparkline = ({
  dangerColor,
  monitor: { downSeries },
}: MonitorSparklineProps) => {
  return downSeries && seriesHasCounts(downSeries) ? (
    <EuiSeriesChart
      animateData={false}
      showDefaultAxis={false}
      width={180}
      height={70}
      stackBy="y"
      // TODO: style hack
      style={{ marginBottom: -24 }}
      xType={EuiSeriesChartUtils.SCALE.TIME}
      xCrosshairFormat="YYYY-MM-DD hh:mmZ"
      showCrosshair={false}
    >
      <EuiHistogramSeries
        data={formatSparklineCounts(downSeries || [])}
        name={i18n.translate('xpack.uptime.monitorList.downLineSeries.downLabel', {
          defaultMessage: 'Down',
        })}
        color={dangerColor}
      />
    </EuiSeriesChart>
  ) : null;
};
