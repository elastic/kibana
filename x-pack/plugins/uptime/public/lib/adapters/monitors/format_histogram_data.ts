/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HistogramDataPoint, HistogramSeries } from '../../../../common/graphql/types';

export const formatHistogramData = (histogram: HistogramSeries[]) => {
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
