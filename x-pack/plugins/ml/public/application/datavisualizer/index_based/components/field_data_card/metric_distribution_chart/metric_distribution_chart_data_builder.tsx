/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const METRIC_DISTRIBUTION_CHART_MIN_BAR_WIDTH = 3; // Minimum bar width, in pixels.
const METRIC_DISTRIBUTION_CHART_MAX_BAR_HEIGHT_FACTOR = 20; // Max bar height relative to median bar height.

import { MetricDistributionChartData } from './metric_distribution_chart';

interface DistributionPercentile {
  minValue: number;
  maxValue: number;
  percent: number;
}

interface DistributionChartBar {
  x0: number;
  x1: number;
  y: number;
  dataMin: number;
  dataMax: number;
  percent: number;
  isMinWidth: boolean;
}

export function buildChartDataFromStats(
  stats: any,
  chartWidth: number
): MetricDistributionChartData[] {
  // Process the raw percentiles data so it is in a suitable format for plotting in the metric distribution chart.
  let chartData: MetricDistributionChartData[] = [];

  const distribution = stats.distribution;
  if (distribution === undefined) {
    return chartData;
  }

  const percentiles: DistributionPercentile[] = distribution.percentiles;
  if (percentiles.length === 0) {
    return chartData;
  }

  // Adjust x axis min and max if there is a single bar.
  const minX = percentiles[0].minValue;
  const maxX = percentiles[percentiles.length - 1].maxValue;

  let xAxisMin: number = minX;
  let xAxisMax: number = maxX;
  if (maxX === minX) {
    if (minX !== 0) {
      xAxisMin = 0;
      xAxisMax = 2 * minX;
    } else {
      xAxisMax = 1;
    }
  }

  // Adjust the right hand x coordinates so that each bar is at least METRIC_DISTRIBUTION_CHART_MIN_BAR_WIDTH.
  const minBarWidth =
    (METRIC_DISTRIBUTION_CHART_MIN_BAR_WIDTH / chartWidth) * (xAxisMax - xAxisMin);
  const processedData: DistributionChartBar[] = [];
  let lastBar: DistributionChartBar;
  percentiles.forEach((data, index) => {
    if (index === 0) {
      const bar: DistributionChartBar = {
        x0: data.minValue,
        x1: Math.max(data.minValue + minBarWidth, data.maxValue),
        y: 0, // Set below
        dataMin: data.minValue,
        dataMax: data.maxValue,
        percent: data.percent,
        isMinWidth: false,
      };

      // Scale the height of the bar according to the range of data values in the bar.
      bar.y =
        (data.percent / (bar.x1 - bar.x0)) *
        Math.max(1, minBarWidth / Math.max(data.maxValue - data.minValue, 0.5 * minBarWidth));
      bar.isMinWidth = data.maxValue <= data.minValue + minBarWidth;
      processedData.push(bar);
      lastBar = bar;
    } else {
      if (lastBar.isMinWidth === false || data.maxValue > lastBar.x1) {
        const bar = {
          x0: lastBar.x1,
          x1: Math.max(lastBar.x1 + minBarWidth, data.maxValue),
          y: 0, // Set below
          dataMin: data.minValue,
          dataMax: data.maxValue,
          percent: data.percent,
          isMinWidth: false,
        };

        // Scale the height of the bar according to the range of data values in the bar.
        bar.y =
          (data.percent / (bar.x1 - bar.x0)) *
          Math.max(1, minBarWidth / Math.max(data.maxValue - data.minValue, 0.5 * minBarWidth));
        bar.isMinWidth = data.maxValue <= lastBar.x1 + minBarWidth;
        processedData.push(bar);
        lastBar = bar;
      } else {
        // Combine bars which are less than minBarWidth apart.
        lastBar.percent = lastBar.percent + data.percent;
        lastBar.y = lastBar.percent / (lastBar.x1 - lastBar.x0);
        lastBar.dataMax = data.maxValue;
      }
    }
  });

  if (maxX !== minX) {
    xAxisMax = processedData[processedData.length - 1].x1;
  }

  // Adjust the maximum bar height to be (METRIC_DISTRIBUTION_CHART_MAX_BAR_HEIGHT_FACTOR * median bar height).
  let barHeights = processedData.map((data) => data.y);
  barHeights = barHeights.sort((a, b) => a - b);

  let maxBarHeight = 0;
  const processedDataLength = processedData.length;
  if (Math.abs(processedDataLength % 2) === 1) {
    maxBarHeight =
      METRIC_DISTRIBUTION_CHART_MAX_BAR_HEIGHT_FACTOR *
      barHeights[Math.floor(processedDataLength / 2)];
  } else {
    maxBarHeight =
      (METRIC_DISTRIBUTION_CHART_MAX_BAR_HEIGHT_FACTOR *
        (barHeights[Math.floor(processedDataLength / 2) - 1] +
          barHeights[Math.floor(processedDataLength / 2)])) /
      2;
  }

  processedData.forEach((data) => {
    data.y = Math.min(data.y, maxBarHeight);
  });

  // Convert the data to the format used by the chart.
  chartData = processedData.map((data) => {
    const { x0, y, dataMin, dataMax, percent } = data;
    return { x: x0, y, dataMin, dataMax, percent };
  });

  // Add a final point to drop the curve back to the y axis.
  const last = processedData[processedData.length - 1];
  chartData.push({
    x: last.x1,
    y: 0,
    dataMin: last.dataMin,
    dataMax: last.dataMax,
    percent: last.percent,
  });

  return chartData;
}
