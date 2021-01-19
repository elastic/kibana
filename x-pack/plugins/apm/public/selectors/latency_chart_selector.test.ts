/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTheme } from '../../../xpack_legacy/common';
import { ENVIRONMENT_ALL } from '../../common/environment_filter_values';
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
  anomalyTimeseries: [
    {
      job: {
        environment: 'production',
        id: 'apm-production',
      },
      anomalyBoundaries: [{ x: 1, y: 2, y0: 1 }],
      anomalyScore: [{ x: 1, x0: 2 }],
    },
    {
      job: {
        environment: 'testing',
        id: 'apm-testing',
      },
      anomalyBoundaries: [{ x: 1, y: 2, y0: 1 }],
      anomalyScore: [{ x: 1, x0: 2 }],
    },
  ],
} as LatencyChartsResponse;

describe('getLatencyChartSelector', () => {
  describe('without anomaly', () => {
    it('returns default values when data is undefined', () => {
      const latencyChart = getLatencyChartSelector({
        theme,
        availableEnvironments: [],
        selectedEnvironment: ENVIRONMENT_ALL.value,
      });
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
        availableEnvironments: [],
        selectedEnvironment: ENVIRONMENT_ALL.value,
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
        availableEnvironments: [],
        selectedEnvironment: ENVIRONMENT_ALL.value,
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
        availableEnvironments: [],
        selectedEnvironment: ENVIRONMENT_ALL.value,
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
        availableEnvironments: ['production'],
        selectedEnvironment: ENVIRONMENT_ALL.value,
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
              fit: 'linear',
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
              fit: 'linear',
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
        mlJobId: 'apm-production',
      });
    });

    describe('when ENVIRONMENT_ALL is selected', () => {
      it('returns ml data when there is only one environment', () => {
        const { anomalyTimeseries } = getLatencyChartSelector({
          latencyChart: latencyChartData,
          theme,
          latencyAggregationType: LatencyAggregationType.p99,
          availableEnvironments: ['production'],
          selectedEnvironment: ENVIRONMENT_ALL.value,
        });

        expect(anomalyTimeseries).not.toBeUndefined();
      });

      it('does not return ml data when there are multiple or no environments', () => {
        const { anomalyTimeseries } = getLatencyChartSelector({
          latencyChart: latencyChartData,
          theme,
          latencyAggregationType: LatencyAggregationType.p99,
          availableEnvironments: ['production', 'staging'],
          selectedEnvironment: ENVIRONMENT_ALL.value,
        });

        expect(anomalyTimeseries).toBeUndefined();
      });
    });

    describe('when the selected environment has ML data', () => {
      it('returns ml data', () => {
        const { anomalyTimeseries, mlJobId } = getLatencyChartSelector({
          latencyChart: latencyChartData,
          theme,
          latencyAggregationType: LatencyAggregationType.p99,
          availableEnvironments: ['testing'],
          selectedEnvironment: 'testing',
        });

        expect(anomalyTimeseries).not.toBeUndefined();

        expect(mlJobId).toBe('apm-testing');
      });
    });

    describe('when the selected environment does not have ML data', () => {
      it('does not return ml data', () => {
        const { anomalyTimeseries } = getLatencyChartSelector({
          latencyChart: latencyChartData,
          theme,
          latencyAggregationType: LatencyAggregationType.p99,
          availableEnvironments: ['production'],
          selectedEnvironment: 'staging',
        });

        expect(anomalyTimeseries).toBeUndefined();
      });
    });
  });
});
