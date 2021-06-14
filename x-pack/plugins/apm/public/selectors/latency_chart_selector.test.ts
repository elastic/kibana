/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTheme } from '../../../../../src/plugins/kibana_react/common';
import { LatencyAggregationType } from '../../common/latency_aggregation_types';
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
    euiColorMediumShade: 'green',
  },
} as EuiTheme;

const latencyChartData = {
  currentPeriod: {
    overallAvgDuration: 1,
    latencyTimeseries: [{ x: 1, y: 10 }],
  },
  previousPeriod: {
    overallAvgDuration: 1,
    latencyTimeseries: [{ x: 1, y: 10 }],
  },
  anomalyTimeseries: {
    jobId: '1',
    anomalyBoundaries: [{ x: 1, y: 2, y0: 1 }],
    anomalyScore: [{ x: 1, x0: 2 }],
  },
} as LatencyChartsResponse;

describe('getLatencyChartSelector', () => {
  describe('without anomaly', () => {
    it('returns default values when data is undefined', () => {
      const latencyChart = getLatencyChartSelector({ theme });
      expect(latencyChart).toEqual({
        currentPeriod: undefined,
        previousPeriod: undefined,
        mlJobId: undefined,
        anomalyTimeseries: undefined,
      });
    });

    it('returns average timeseries', () => {
      const { anomalyTimeseries, ...latencyWithoutAnomaly } = latencyChartData;
      const latencyTimeseries = getLatencyChartSelector({
        latencyChart: latencyWithoutAnomaly as LatencyChartsResponse,
        theme,
        latencyAggregationType: LatencyAggregationType.avg,
      });
      expect(latencyTimeseries).toEqual({
        currentPeriod: {
          title: 'Average',
          data: [{ x: 1, y: 10 }],
          legendValue: '1 μs',
          type: 'linemark',
          color: 'blue',
        },

        previousPeriod: {
          color: 'green',
          data: [{ x: 1, y: 10 }],
          type: 'area',
          title: 'Previous period',
        },
      });
    });

    it('returns 95th percentile timeseries', () => {
      const { anomalyTimeseries, ...latencyWithoutAnomaly } = latencyChartData;
      const latencyTimeseries = getLatencyChartSelector({
        latencyChart: latencyWithoutAnomaly as LatencyChartsResponse,
        theme,
        latencyAggregationType: LatencyAggregationType.p95,
      });
      expect(latencyTimeseries).toEqual({
        currentPeriod: {
          title: '95th percentile',
          titleShort: '95th',
          data: [{ x: 1, y: 10 }],
          type: 'linemark',
          color: 'red',
        },
        previousPeriod: {
          data: [{ x: 1, y: 10 }],
          type: 'area',
          color: 'green',
          title: 'Previous period',
        },
      });
    });

    it('returns 99th percentile timeseries', () => {
      const { anomalyTimeseries, ...latencyWithoutAnomaly } = latencyChartData;
      const latencyTimeseries = getLatencyChartSelector({
        latencyChart: latencyWithoutAnomaly as LatencyChartsResponse,
        theme,
        latencyAggregationType: LatencyAggregationType.p99,
      });

      expect(latencyTimeseries).toEqual({
        currentPeriod: {
          title: '99th percentile',
          titleShort: '99th',
          data: [{ x: 1, y: 10 }],
          type: 'linemark',
          color: 'black',
        },
        previousPeriod: {
          data: [{ x: 1, y: 10 }],
          type: 'area',
          color: 'green',
          title: 'Previous period',
        },
      });
    });
  });

  describe('with anomaly', () => {
    it('returns latency time series and anomaly timeseries', () => {
      const latencyTimeseries = getLatencyChartSelector({
        latencyChart: latencyChartData,
        theme,
        latencyAggregationType: LatencyAggregationType.p99,
      });
      expect(latencyTimeseries).toEqual({
        currentPeriod: {
          title: '99th percentile',
          titleShort: '99th',
          data: [{ x: 1, y: 10 }],
          type: 'linemark',
          color: 'black',
        },
        previousPeriod: {
          data: [{ x: 1, y: 10 }],
          type: 'area',
          color: 'green',
          title: 'Previous period',
        },
        mlJobId: '1',
        anomalyTimeseries: {
          boundaries: [
            {
              type: 'area',
              fit: 'lookahead',
              hideLegend: true,
              hideTooltipValue: true,
              stackAccessors: ['y'],
              areaSeriesStyle: { point: { opacity: 0 } },
              title: 'anomalyBoundariesLower',
              data: [{ x: 1, y: 1 }],
              color: 'rgba(0,0,0,0)',
            },
            {
              type: 'area',
              fit: 'lookahead',
              hideLegend: true,
              hideTooltipValue: true,
              stackAccessors: ['y'],
              areaSeriesStyle: { point: { opacity: 0 } },
              title: 'anomalyBoundariesUpper',
              data: [{ x: 1, y: 1 }],
              color: 'rgba(0,0,255,0.5)',
            },
          ],
          scores: {
            title: 'anomalyScores',
            type: 'rectAnnotation',
            data: [{ x: 1, x0: 2 }],
            color: 'yellow',
          },
        },
      });
    });
  });
});
