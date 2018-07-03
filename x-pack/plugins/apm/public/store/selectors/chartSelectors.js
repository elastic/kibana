/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import d3 from 'd3';
import { last, zipObject, difference, memoize, get, isEmpty } from 'lodash';
import { colors } from '../../style/variables';
import {
  asMillisWithDefault,
  asDecimal,
  tpmUnit
} from '../../utils/formatters';

export const getEmptySerie = memoize(
  (start = Date.now() - 3600000, end = Date.now()) => {
    const dates = d3.time
      .scale()
      .domain([new Date(start), new Date(end)])
      .ticks();

    return [
      {
        data: dates.map(x => ({
          x: x.getTime(),
          y: 1
        }))
      }
    ];
  },
  (...args) => args.join('_')
);

export function getCharts(urlParams, charts) {
  const { start, end, transactionType } = urlParams;
  const noHits = charts.totalHits === 0;
  const tpmSeries = noHits
    ? getEmptySerie(start, end)
    : getTpmSeries(charts, transactionType);

  const responseTimeSeries = noHits
    ? getEmptySerie(start, end)
    : getResponseTimeSeries(charts);

  return {
    noHits,
    tpmSeries,
    responseTimeSeries
  };
}

export function getResponseTimeSeries(chartsData) {
  const { dates, overallAvgDuration } = chartsData;
  const { avg, p95, p99, avgAnomalies } = chartsData.responseTimes;

  const series = [
    {
      title: 'Avg.',
      data: getChartValues(dates, avg),
      legendValue: `${asMillisWithDefault(overallAvgDuration)}`,
      type: 'line',
      color: colors.apmBlue
    },
    {
      title: '95th percentile',
      titleShort: '95th',
      data: getChartValues(dates, p95),
      type: 'line',
      color: colors.apmYellow
    },
    {
      title: '99th percentile',
      titleShort: '99th',
      data: getChartValues(dates, p99),
      type: 'line',
      color: colors.apmOrange
    }
  ];

  if (!isEmpty(avgAnomalies.buckets)) {
    // insert after Avg. serie
    series.splice(1, 0, {
      title: 'Anomaly Boundaries',
      hideLegend: true,
      hideTooltipValue: true,
      data: getAnomalyBoundaryValues(
        dates,
        avgAnomalies.buckets,
        avgAnomalies.bucketSpanAsMillis
      ),
      type: 'area',
      color: 'none',
      areaColor: 'rgba(49, 133, 252, 0.1)' // apmBlue
    });

    series.splice(1, 0, {
      title: 'Anomaly score',
      hideLegend: true,
      hideTooltipValue: true,
      data: getAnomalyScoreValues(
        dates,
        avgAnomalies.buckets,
        avgAnomalies.bucketSpanAsMillis
      ),
      type: 'areaMaxHeight',
      color: 'none',
      areaColor: 'rgba(146, 0, 0, 0.1)' // apmRed
    });
  }

  return series;
}

export function getTpmSeries(chartsData, transactionType) {
  const { dates, tpmBuckets } = chartsData;
  const getColor = getColorByKey(tpmBuckets.map(({ key }) => key));
  const getTpmLegendTitle = bucketKey => {
    // hide legend text for transactions without "result"
    if (bucketKey === 'transaction_result_missing') {
      return '';
    }

    return bucketKey;
  };

  return tpmBuckets.map(bucket => {
    return {
      title: getTpmLegendTitle(bucket.key),
      data: getChartValues(dates, bucket.values),
      legendValue: `${asDecimal(bucket.avg)} ${tpmUnit(transactionType)}`,
      type: 'line',
      color: getColor(bucket.key)
    };
  });
}

function getColorByKey(keys) {
  const assignedColors = {
    'HTTP 2xx': colors.apmGreen,
    'HTTP 3xx': colors.apmYellow,
    'HTTP 4xx': colors.apmOrange,
    'HTTP 5xx': colors.apmRed2
  };

  const unknownKeys = difference(keys, Object.keys(assignedColors));
  const unassignedColors = zipObject(unknownKeys, [
    colors.apmBlue,
    colors.apmPurple,
    colors.apmPink,
    colors.apmTan,
    colors.apmRed,
    colors.apmBrown
  ]);

  return key => assignedColors[key] || unassignedColors[key];
}

function getChartValues(dates = [], buckets = []) {
  return dates.map((x, i) => ({
    x,
    y: buckets[i]
  }));
}

export function getAnomalyScoreValues(
  dates = [],
  buckets = [],
  bucketSpanAsMillis
) {
  const ANOMALY_THRESHOLD = 75;
  const getX = (currentX, i) => currentX + bucketSpanAsMillis * i;

  return dates
    .map((x, i) => {
      const { anomalyScore } = buckets[i] || {};
      return {
        x,
        anomalyScore
      };
    })
    .filter(p => p.anomalyScore > ANOMALY_THRESHOLD)
    .reduce((acc, p, i, points) => {
      acc.push({ x: p.x, y: 1 });
      const { x: nextX } = points[i + 1] || {};
      const endX = getX(p.x, 1);
      if (nextX == null || nextX > endX) {
        acc.push(
          {
            x: endX,
            y: 1
          },
          {
            x: getX(p.x, 2)
          }
        );
      }

      return acc;
    }, []);
}

export function getAnomalyBoundaryValues(
  dates = [],
  buckets = [],
  bucketSpanAsMillis
) {
  const lastX = last(dates);
  return dates
    .map((x, i) => ({
      x,
      y0: get(buckets[i], 'lower'),
      y: get(buckets[i], 'upper')
    }))
    .filter(point => point.y != null)
    .reduce((acc, p, i, points) => {
      const isLast = last(points) === p;
      acc.push(p);

      if (isLast) {
        acc.push({
          ...p,
          x: Math.min(p.x + bucketSpanAsMillis, lastX) // avoid going beyond the last date
        });
      }
      return acc;
    }, []);
}
