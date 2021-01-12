/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTheme } from '../../../xpack_legacy/common';
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
  },
} as EuiTheme;

const latencyChartData = {
  overallAvgDuration: 1,
  latencyTimeseries: [{ x: 1, y: 10 }],
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
        latencyTimeseries: [],
        mlJobId: undefined,
        anomalyTimeseries: undefined,
      });
    });

    it('returns average timeseries', () => {
      const { anomalyTimeseries, ...latencyWithouAnomaly } = latencyChartData;
      const latencyTimeseries = getLatencyChartSelector({
        latencyChart: latencyWithouAnomaly as LatencyChartsResponse,
        theme,
        latencyAggregationType: LatencyAggregationType.avg,
      });
      expect(latencyTimeseries).toEqual({
        latencyTimeseries: [
          {
            title: 'Average',
            data: [{ x: 1, y: 10 }],
            legendValue: '1 μs',
            type: 'linemark',
            color: 'blue',
          },
        ],
      });
    });

    it('returns 95th percentile timeseries', () => {
      const { anomalyTimeseries, ...latencyWithouAnomaly } = latencyChartData;
      const latencyTimeseries = getLatencyChartSelector({
        latencyChart: latencyWithouAnomaly as LatencyChartsResponse,
        theme,
        latencyAggregationType: LatencyAggregationType.p95,
      });
      expect(latencyTimeseries).toEqual({
        latencyTimeseries: [
          {
            title: '95th percentile',
            data: [{ x: 1, y: 10 }],
            titleShort: '95th',
            type: 'linemark',
            color: 'red',
          },
        ],
      });
    });

    it('returns 99th percentile timeseries', () => {
      const { anomalyTimeseries, ...latencyWithouAnomaly } = latencyChartData;
      const latencyTimeseries = getLatencyChartSelector({
        latencyChart: latencyWithouAnomaly as LatencyChartsResponse,
        theme,
        latencyAggregationType: LatencyAggregationType.p99,
      });
      expect(latencyTimeseries).toEqual({
        latencyTimeseries: [
          {
            title: '99th percentile',
            data: [{ x: 1, y: 10 }],
            titleShort: '99th',
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
        latencyAggregationType: LatencyAggregationType.p99,
      });
      expect(latencyTimeseries).toEqual({
        anomalyTimeseries: {
          boundaries: [
            {
              color: 'rgba(0,0,0,0)',
              areaSeriesStyle: {
                point: {
                  opacity: 0,
                },
              },
              data: [
                {
                  x: 1,
                  y: 1,
                },
              ],
              fit: 'lookahead',
              hideLegend: true,
              hideTooltipValue: true,
              stackAccessors: ['y'],
              title: 'anomalyBoundariesLower',
              type: 'area',
            },
            {
              color: 'rgba(0,0,255,0.5)',
              areaSeriesStyle: {
                point: {
                  opacity: 0,
                },
              },
              data: [
                {
                  x: 1,
                  y: 1,
                },
              ],
              fit: 'lookahead',
              hideLegend: true,
              hideTooltipValue: true,
              stackAccessors: ['y'],
              title: 'anomalyBoundariesUpper',
              type: 'area',
            },
          ],
          scores: {
            color: 'yellow',
            data: [
              {
                x: 1,
                x0: 2,
              },
            ],
            title: 'anomalyScores',
            type: 'rectAnnotation',
          },
        },
        latencyTimeseries: [
          {
            color: 'black',
            data: [
              {
                x: 1,
                y: 10,
              },
            ],
            title: '99th percentile',
            titleShort: '99th',
            type: 'linemark',
          },
        ],
        mlJobId: '1',
      });
    });
  });
});
