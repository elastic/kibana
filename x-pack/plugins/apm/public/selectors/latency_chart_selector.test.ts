/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LatencyAggregationType } from '../../common/latency_aggregation_types';
import {
  getLatencyChartSelector,
  LatencyChartsResponse,
} from './latency_chart_selectors';
import * as timeSeriesColor from '../components/shared/charts/helper/get_timeseries_color';

const latencyChartData = {
  currentPeriod: {
    overallAvgDuration: 1,
    latencyTimeseries: [{ x: 1, y: 10 }],
  },
  previousPeriod: {
    overallAvgDuration: 1,
    latencyTimeseries: [{ x: 1, y: 10 }],
  },
} as LatencyChartsResponse;

describe('getLatencyChartSelector', () => {
  beforeAll(() => {
    jest.spyOn(timeSeriesColor, 'getTimeSeriesColor').mockImplementation(() => {
      return {
        currentPeriodColor: 'green',
        previousPeriodColor: 'black',
      };
    });
  });

  describe('without anomaly', () => {
    it('returns default values when data is undefined', () => {
      const latencyChart = getLatencyChartSelector({});
      expect(latencyChart).toEqual({
        currentPeriod: undefined,
        previousPeriod: undefined,
      });
    });

    it('returns average timeseries', () => {
      const latencyTimeseries = getLatencyChartSelector({
        latencyChart: latencyChartData,
        latencyAggregationType: LatencyAggregationType.avg,
      });
      expect(latencyTimeseries).toEqual({
        currentPeriod: {
          title: 'Average',
          data: [{ x: 1, y: 10 }],
          legendValue: '1 μs',
          type: 'linemark',
          color: 'green',
        },

        previousPeriod: {
          color: 'black',
          data: [{ x: 1, y: 10 }],
          type: 'area',
          title: 'Previous period',
        },
      });
    });

    it('returns 95th percentile timeseries', () => {
      const latencyTimeseries = getLatencyChartSelector({
        latencyChart: latencyChartData,
        latencyAggregationType: LatencyAggregationType.p95,
      });
      expect(latencyTimeseries).toEqual({
        currentPeriod: {
          title: '95th percentile',
          titleShort: '95th',
          data: [{ x: 1, y: 10 }],
          type: 'linemark',
          color: 'green',
        },
        previousPeriod: {
          data: [{ x: 1, y: 10 }],
          type: 'area',
          color: 'black',
          title: 'Previous period',
        },
      });
    });

    it('returns 99th percentile timeseries', () => {
      const latencyTimeseries = getLatencyChartSelector({
        latencyChart: latencyChartData,
        latencyAggregationType: LatencyAggregationType.p99,
      });

      expect(latencyTimeseries).toEqual({
        currentPeriod: {
          title: '99th percentile',
          titleShort: '99th',
          data: [{ x: 1, y: 10 }],
          type: 'linemark',
          color: 'green',
        },
        previousPeriod: {
          data: [{ x: 1, y: 10 }],
          type: 'area',
          color: 'black',
          title: 'Previous period',
        },
      });
    });
  });

  describe('with anomaly', () => {
    it('returns latency time series and anomaly timeseries', () => {
      const latencyTimeseries = getLatencyChartSelector({
        latencyChart: latencyChartData,
        latencyAggregationType: LatencyAggregationType.p99,
      });
      expect(latencyTimeseries).toEqual({
        currentPeriod: {
          title: '99th percentile',
          titleShort: '99th',
          data: [{ x: 1, y: 10 }],
          type: 'linemark',
          color: 'green',
        },
        previousPeriod: {
          data: [{ x: 1, y: 10 }],
          type: 'area',
          color: 'black',
          title: 'Previous period',
        },
      });
    });
  });
});
