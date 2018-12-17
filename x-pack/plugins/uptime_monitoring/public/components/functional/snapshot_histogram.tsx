/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore Missing typings for series charts
import { EuiHistogramSeries, EuiSeriesChart, EuiSeriesChartUtils } from '@elastic/eui';
import React from 'react';
import { HistogramDataPoint, HistogramSeries } from '../../../common/graphql/types';

const formatHistogramData = (histogram: HistogramSeries[]) => {
  const histogramSeriesData: { upSeriesData: any[]; downSeriesData: any[] } = {
    upSeriesData: [],
    downSeriesData: [],
  };
  // TODO: there's a lot of nesting here, refactor this function
  histogram.forEach(({ data }) => {
    if (data) {
      data.forEach(dataPoint => {
        if (dataPoint) {
          const { x, x0, downCount } = dataPoint;
          const findPointInSeries = (hdp: HistogramDataPoint) => hdp.x === x && hdp.x0 === x0;
          const upEntry = histogramSeriesData.upSeriesData.find(findPointInSeries);
          const downEntry = histogramSeriesData.downSeriesData.find(findPointInSeries);
          if (downCount) {
            if (downEntry) {
              downEntry.y += 1;
            } else {
              histogramSeriesData.downSeriesData.push({ x, x0, y: 1 });
            }
          } else {
            if (upEntry) {
              upEntry.y += 1;
            } else {
              histogramSeriesData.upSeriesData.push({ x, x0, y: 1 });
            }
          }
        }
      });
    }
  });
  return histogramSeriesData;
};

interface SnapshotHistogramProps {
  histogram: HistogramSeries[];
}

export const SnapshotHistogram = ({ histogram }: SnapshotHistogramProps) => {
  const { upSeriesData, downSeriesData } = formatHistogramData(histogram);

  return (
    <EuiSeriesChart width={600} height={107} stackBy="y" xType={EuiSeriesChartUtils.SCALE.TIME}>
      <EuiHistogramSeries data={upSeriesData} name="Up" color="green" />
      <EuiHistogramSeries data={downSeriesData} name="Down" color="red" />
    </EuiSeriesChart>
  );
};
