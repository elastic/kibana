/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HistogramDataPoint, HistogramSeries } from '../../../../common/graphql/types';

interface FormattedHistogramData {
  upSeriesData: HistogramDataPoint[];
  downSeriesData: HistogramDataPoint[];
}

/**
 * This function reduces a series of monitors' histograms into a singular
 * series, which is then displayed as a unified snapshot of the performance
 * of all the monitors over time.
 * @param histograms The series data for the provided monitors
 */
export const formatHistogramData = (histograms: HistogramSeries[]): FormattedHistogramData => {
  return histograms
    .map(({ data }) => data)
    .filter(series => series !== null && series !== undefined)
    .reduce(
      (accumulatedData: FormattedHistogramData, data) => {
        // `data` will not be null/undefined because those elements are filtered
        data!.forEach(dataPoint => {
          const { x, x0, downCount, upCount } = dataPoint;
          const findPointInSeries = (hdp: HistogramDataPoint) => hdp.x === x && hdp.x0 === x0;
          const upEntry = accumulatedData.upSeriesData.find(findPointInSeries);
          const downEntry = accumulatedData.downSeriesData.find(findPointInSeries);
          if (downCount) {
            if (downEntry) {
              downEntry.y += 1;
            } else {
              accumulatedData.downSeriesData.push({ x, x0, y: 1 });
            }
          } else if (upCount) {
            if (upEntry) {
              upEntry.y += 1;
            } else {
              accumulatedData.upSeriesData.push({ x, x0, y: 1 });
            }
          }
        });
        return accumulatedData;
      },
      {
        upSeriesData: [],
        downSeriesData: [],
      }
    );
};
