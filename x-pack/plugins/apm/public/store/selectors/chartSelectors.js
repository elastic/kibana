/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import d3 from 'd3';
import { zipObject, difference, memoize } from 'lodash';
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
  const chartsData = charts.data;
  const noHits = chartsData.totalHits === 0;
  const tpmSeries = noHits
    ? getEmptySerie(start, end)
    : getTpmSeries(chartsData, transactionType);

  const responseTimeSeries = noHits
    ? getEmptySerie(start, end)
    : getResponseTimeSeries(chartsData);

  return {
    ...charts,
    data: {
      noHits,
      tpmSeries,
      responseTimeSeries
    }
  };
}

export function getResponseTimeSeries(chartsData) {
  const { dates, weightedAverage } = chartsData;
  const { avg, p95, p99 } = chartsData.responseTimes;

  return [
    {
      title: 'Avg.',
      data: getChartValues(dates, avg),
      legendValue: `${asMillisWithDefault(weightedAverage)}`,
      type: 'area',
      color: colors.apmBlue,
      areaColor: 'rgba(49, 133, 252, 0.1)' // apmBlue
    },
    {
      title: '95th percentile',
      titleShort: '95th',
      data: getChartValues(dates, p95),
      type: 'area',
      color: colors.apmYellow,
      areaColor: 'rgba(236, 174, 35, 0.1)' // apmYellow
    },
    {
      title: '99th percentile',
      titleShort: '99th',
      data: getChartValues(dates, p99),
      type: 'area',
      color: colors.apmOrange,
      areaColor: 'rgba(249, 133, 16, 0.1)' // apmOrange
    }
  ];
}

function getTpmLegendTitle(bucketKey) {
  // hide legend text for transactions without "result"
  if (bucketKey === 'transaction_result_missing') {
    return '';
  }

  return bucketKey;
}

function getTpmSeries(chartsData, transactionType) {
  const { dates, tpmBuckets } = chartsData;
  const getColor = getColorByKey(tpmBuckets.map(({ key }) => key));

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

function getChartValues(dates = [], yValues = []) {
  return dates.map((x, i) => ({
    x,
    y: yValues[i]
  }));
}
