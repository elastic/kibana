/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import d3 from 'd3';
import {
  zipObject,
  difference,
  memoize,
  get,
  findLastIndex,
  isEmpty
} from 'lodash';
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
  const { dates, weightedAverage } = chartsData;
  const { avg, p95, p99, mlAvg } = chartsData.responseTimes;

  const series = [
    {
      title: 'Avg.',
      data: getChartValues(dates, avg),
      legendValue: `${asMillisWithDefault(weightedAverage)}`,
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

  if (!isEmpty(mlAvg)) {
    // insert after Avg. serie
    series.splice(1, 0, {
      title: 'Anomaly score',
      hideLegend: true,
      formatTooltipValue: (p = {}) => asDecimal(p.anomalyScore),
      data: getMlChartValues(dates, mlAvg),
      type: 'area',
      color: 'none',
      areaColor: 'rgba(49, 133, 252, 0.1)' // apmBlue
    });
  }

  return series;
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

function getMlChartValues(dates = [], yValues = []) {
  const lastIndex = findLastIndex(yValues, item => get(item, 'lower') != null);

  // TODO: Temporary workaround to get rid of null values
  // Replaces null values with the previous value in the list
  const yValuesWithoutGaps = yValues.reduce((acc, item, i) => {
    if (get(item, 'lower') === null && i < lastIndex && i > 0) {
      acc.push(acc[i - 1]);
    } else {
      acc.push(item);
    }

    return acc;
  }, []);

  return dates.map((x, i) => ({
    x,
    y0: get(yValuesWithoutGaps[i], 'lower'),
    y: get(yValuesWithoutGaps[i], 'upper'),
    anomalyScore: get(yValuesWithoutGaps[i], 'anomalyScore')
  }));
}
