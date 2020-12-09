/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTheme } from '../../../xpack_legacy/common';
import {
  getLatencyChartSelector,
  LatencyChartsResponse,
} from './latency_chart_selectors';

const theme = {
  eui: {
    euiColorVis1: 'blue',
    euiColorVis5: 'red',
    euiColorVis7: 'black',
    euiColorVis9: 'yellow',
  },
} as EuiTheme;

const latencyChartData = {
  overallAvgDuration: 1,
  latencyTimeseries: {
    avg: [{ x: 1, y: 10 }],
    p95: [{ x: 2, y: 5 }],
    p99: [{ x: 3, y: 8 }],
  },
  anomalyTimeseries: {
    jobId: '1',
    anomalyBoundaries: [{ x: 1, y: 2 }],
    anomalyScore: [{ x: 1, x0: 2 }],
  },
} as LatencyChartsResponse;

describe('getLatencyChartSelector', () => {
  describe('without anomaly', () => {
    it('returns default values when data is undefined', () => {
      const latencyChart = getLatencyChartSelector({ theme });
      expect(latencyChart).toEqual({
        latencyTimeseries: [],
        mlJobId: undefined,
        anomalyTimeseries: undefined,
      });
    });
    it('returns latency time series', () => {
      const { anomalyTimeseries, ...latencyWithouAnomaly } = latencyChartData;
      const latencyTimeseries = getLatencyChartSelector({
        latencyChart: latencyWithouAnomaly as LatencyChartsResponse,
        theme,
      });
      expect(latencyTimeseries).toEqual({
        latencyTimeseries: [
          {
            title: 'Avg.',
            data: [{ x: 1, y: 10 }],
            legendValue: '1 μs',
            type: 'linemark',
            color: 'blue',
          },
          {
            title: '95th percentile',
            titleShort: '95th',
            data: [{ x: 2, y: 5 }],
            type: 'linemark',
            color: 'red',
          },
          {
            title: '99th percentile',
            titleShort: '99th',
            data: [{ x: 3, y: 8 }],
            type: 'linemark',
            color: 'black',
          },
        ],
      });
    });
  });

  describe('with anomaly', () => {
    it('returns latency time series and anomaly timeseries', () => {
      const latencyTimeseries = getLatencyChartSelector({
        latencyChart: latencyChartData,
        theme,
      });
      expect(latencyTimeseries).toEqual({
        latencyTimeseries: [
          {
            title: 'Avg.',
            data: [{ x: 1, y: 10 }],
            legendValue: '1 μs',
            type: 'linemark',
            color: 'blue',
          },
          {
            title: '95th percentile',
            titleShort: '95th',
            data: [{ x: 2, y: 5 }],
            type: 'linemark',
            color: 'red',
          },
          {
            title: '99th percentile',
            titleShort: '99th',
            data: [{ x: 3, y: 8 }],
            type: 'linemark',
            color: 'black',
          },
        ],
        mlJobId: '1',
        anomalyTimeseries: {
          bounderies: {
            title: 'Anomaly Boundaries',
            data: [{ x: 1, y: 2 }],
            type: 'area',
            color: 'rgba(0,0,255,0.5)',
          },
          scores: {
            title: 'Anomaly score',
            data: [{ x: 1, x0: 2 }],
            type: 'rectAnnotation',
            color: 'yellow',
          },
        },
      });
    });
  });
});
