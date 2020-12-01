/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import {
  getAnomalyScoreSeries,
  getResponseTimeSeries,
  getTpmSeries,
} from './chart_selectors';
import {
  successColor,
  warningColor,
  errorColor,
} from '../utils/httpStatusCodeToColor';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ApmTimeSeriesResponse } from '../../server/lib/transactions/charts/get_timeseries_data/transform';

describe('chart selectors', () => {
  describe('getAnomalyScoreSeries', () => {
    it('should return anomalyScoreSeries', () => {
      const data = [{ x0: 0, x: 10 }];
      expect(getAnomalyScoreSeries(data)).toEqual({
        color: '#e7664c',
        data: [{ x0: 0, x: 10 }],
        title: 'Anomaly score',
        type: 'rectAnnotation',
      });
    });
  });

  describe('getResponseTimeSeries', () => {
    const apmTimeseries = {
      responseTimes: {
        avg: [
          { x: 0, y: 100 },
          { x: 1000, y: 200 },
        ],
        p95: [
          { x: 0, y: 200 },
          { x: 1000, y: 300 },
        ],
        p99: [
          { x: 0, y: 300 },
          { x: 1000, y: 400 },
        ],
      },
      tpmBuckets: [],
      overallAvgDuration: 200,
    };

    it('should produce correct series', () => {
      expect(getResponseTimeSeries({ apmTimeseries })).toEqual([
        {
          color: '#6092c0',
          data: [
            { x: 0, y: 100 },
            { x: 1000, y: 200 },
          ],
          legendValue: '200 μs',
          title: 'Avg.',
          type: 'linemark',
        },
        {
          color: '#d6bf57',
          data: [
            { x: 0, y: 200 },
            { x: 1000, y: 300 },
          ],
          title: '95th percentile',
          titleShort: '95th',
          type: 'linemark',
        },
        {
          color: '#da8b45',
          data: [
            { x: 0, y: 300 },
            { x: 1000, y: 400 },
          ],
          title: '99th percentile',
          titleShort: '99th',
          type: 'linemark',
        },
      ]);
    });

    it('should return 3 series', () => {
      expect(getResponseTimeSeries({ apmTimeseries }).length).toBe(3);
    });
  });

  describe('getTpmSeries', () => {
    const apmTimeseries: ApmTimeSeriesResponse = {
      responseTimes: {
        avg: [],
        p95: [],
        p99: [],
      },
      tpmBuckets: [
        {
          key: 'HTTP 2xx',
          avg: 3.5,
          dataPoints: [
            { x: 0, y: 5 },
            { x: 1, y: 2 },
          ],
        },
        { key: 'HTTP 4xx', avg: 1, dataPoints: [{ x: 0, y: 1 }] },
        { key: 'HTTP 5xx', avg: 0, dataPoints: [{ x: 0, y: 0 }] },
      ],
      overallAvgDuration: 200,
    };
    const transactionType = 'MyTransactionType';

    it('produces correct series', () => {
      expect(getTpmSeries(apmTimeseries, transactionType)).toEqual([
        {
          color: successColor,
          data: [
            { x: 0, y: 5 },
            { x: 1, y: 2 },
          ],
          legendValue: '3.5 tpm',
          title: 'HTTP 2xx',
          type: 'linemark',
        },
        {
          color: warningColor,
          data: [{ x: 0, y: 1 }],
          legendValue: '1.0 tpm',
          title: 'HTTP 4xx',
          type: 'linemark',
        },
        {
          color: errorColor,
          data: [{ x: 0, y: 0 }],
          legendValue: '0 tpm',
          title: 'HTTP 5xx',
          type: 'linemark',
        },
      ]);
    });

    describe('with success buckets', () => {
      it('uses a success color', () => {
        const key = 'it was a success';
        expect(
          getTpmSeries({
            ...apmTimeseries,
            tpmBuckets: [{ key, avg: 0, dataPoints: [{ x: 0, y: 0 }] }],
          })[0].color
        ).toEqual(theme.euiColorSecondary);
      });
    });

    describe('with SUCESS buckets', () => {
      it('uses a success color', () => {
        const key = 'it was a Success';
        expect(
          getTpmSeries({
            ...apmTimeseries,
            tpmBuckets: [{ key, avg: 0, dataPoints: [{ x: 0, y: 0 }] }],
          })[0].color
        ).toEqual(theme.euiColorSecondary);
      });
    });

    describe('with ok buckets', () => {
      it('uses a success color', () => {
        const key = 'it was ok';
        expect(
          getTpmSeries({
            ...apmTimeseries,
            tpmBuckets: [{ key, avg: 0, dataPoints: [{ x: 0, y: 0 }] }],
          })[0].color
        ).toEqual(theme.euiColorSecondary);
      });
    });

    describe('with OK buckets', () => {
      it('uses a success color', () => {
        const key = 'it was OK';
        expect(
          getTpmSeries({
            ...apmTimeseries,
            tpmBuckets: [{ key, avg: 0, dataPoints: [{ x: 0, y: 0 }] }],
          })[0].color
        ).toEqual(theme.euiColorSecondary);
      });
    });

    describe('with fail buckets', () => {
      it('uses a failure color', () => {
        const key = 'it failed';
        expect(
          getTpmSeries({
            ...apmTimeseries,
            tpmBuckets: [{ key, avg: 0, dataPoints: [{ x: 0, y: 0 }] }],
          })[0].color
        ).toEqual(theme.euiColorDanger);
      });
    });

    describe('with FAIL buckets', () => {
      it('uses a failure color', () => {
        const key = 'it FAILED';
        expect(
          getTpmSeries({
            ...apmTimeseries,
            tpmBuckets: [{ key, avg: 0, dataPoints: [{ x: 0, y: 0 }] }],
          })[0].color
        ).toEqual(theme.euiColorDanger);
      });
    });

    describe('with error buckets', () => {
      it('uses a failure color', () => {
        const key = 'Quizás fuera un error';
        expect(
          getTpmSeries({
            ...apmTimeseries,
            tpmBuckets: [{ key, avg: 0, dataPoints: [{ x: 0, y: 0 }] }],
          })[0].color
        ).toEqual(theme.euiColorDanger);
      });
    });

    describe('with ERROR buckets', () => {
      it('uses a failure color', () => {
        const key = 'Quizás fuera un ErroR';
        expect(
          getTpmSeries({
            ...apmTimeseries,
            tpmBuckets: [{ key, avg: 0, dataPoints: [{ x: 0, y: 0 }] }],
          })[0].color
        ).toEqual(theme.euiColorDanger);
      });
    });

    describe('when empty', () => {
      it('produces an empty series', () => {
        const responseTimes = {
          avg: [
            { x: 0, y: 1 },
            { x: 100, y: 1 },
          ],
          p95: [
            { x: 0, y: 1 },
            { x: 100, y: 1 },
          ],
          p99: [
            { x: 0, y: 1 },
            { x: 100, y: 1 },
          ],
        };
        const series = getTpmSeries(
          { ...apmTimeseries, responseTimes, tpmBuckets: [] },
          transactionType
        );

        expect(series[0].data.length).toBe(11);
        expect(series[0].data[0].x).toBe(0);
        expect(series[0].data[10].x).toBe(100);
      });
    });
  });
});
