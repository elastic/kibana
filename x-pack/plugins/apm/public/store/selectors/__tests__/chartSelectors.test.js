/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getAnomalyScoreValues,
  getResponseTimeSeries,
  getTpmSeries,
  getAnomalyBoundaryValues
} from '../chartSelectors';

import anomalyData from './mockData/anomalyData.json';

describe('chartSelectors', () => {
  describe('getAnomalyScoreValues', () => {
    it('should return anomaly score series', () => {
      const dates = [0, 1000, 2000, 3000, 4000, 5000, 6000];
      const buckets = [
        {
          anomalyScore: null
        },
        {
          anomalyScore: 80
        },
        {
          anomalyScore: 0
        },
        {
          anomalyScore: 0
        },
        {
          anomalyScore: 70
        },
        {
          anomalyScore: 80
        },
        {
          anomalyScore: 0
        }
      ];

      expect(getAnomalyScoreValues(dates, buckets, 1000)).toEqual([
        { x: 1000, y: 1 },
        { x: 2000, y: 1 },
        { x: 3000 },
        { x: 5000, y: 1 },
        { x: 6000, y: 1 },
        { x: 7000 }
      ]);
    });
  });

  describe('getResponseTimeSeries', () => {
    const chartsData = {
      dates: [0, 1000, 2000, 3000, 4000, 5000],
      responseTimes: {
        avg: [100, 200, 150, 250, 100, 50],
        p95: [200, 300, 250, 350, 200, 150],
        p99: [300, 400, 350, 450, 100, 50],
        avgAnomalies: {}
      },
      overallAvgDuration: 200
    };

    it('should match snapshot', () => {
      expect(getResponseTimeSeries(chartsData)).toMatchSnapshot();
    });

    it('should return 3 series', () => {
      expect(getResponseTimeSeries(chartsData).length).toBe(3);
    });
  });

  describe('getTpmSeries', () => {
    const chartsData = {
      dates: [0, 1000, 2000, 3000, 4000, 5000],
      tpmBuckets: [
        {
          key: 'HTTP 2xx',
          avg: 10,
          values: [5, 10, 3, 8, 4, 9]
        },
        {
          key: 'HTTP 4xx',
          avg: 2,
          values: [1, 2, 3, 2, 3, 1]
        },
        {
          key: 'HTTP 5xx',
          avg: 1,
          values: [0, 1, 2, 1, 0, 2]
        }
      ]
    };

    const transactionType = 'MyTransactionType';

    it('should match snapshot', () => {
      expect(getTpmSeries(chartsData, transactionType)).toMatchSnapshot();
    });
  });

  describe('getAnomalyBoundaryValues', () => {
    const { dates, buckets } = anomalyData;
    const bucketSpan = 240000;

    it('should return correct buckets', () => {
      expect(getAnomalyBoundaryValues(dates, buckets, bucketSpan)).toEqual([
        { x: 1530614880000, y: 54799, y0: 15669 },
        { x: 1530615060000, y: 49874, y0: 17808 },
        { x: 1530615300000, y: 49421, y0: 18012 },
        { x: 1530615540000, y: 49654, y0: 17889 },
        { x: 1530615780000, y: 50026, y0: 17713 },
        { x: 1530616020000, y: 49371, y0: 18044 },
        { x: 1530616260000, y: 50110, y0: 17713 },
        { x: 1530616500000, y: 50419, y0: 17582 },
        { x: 1530616620000, y: 50419, y0: 17582 }
      ]);
    });

    it('should extend the last bucket with a size of bucketSpan', () => {
      const [lastBucket, secondLastBuckets] = getAnomalyBoundaryValues(
        dates,
        buckets,
        bucketSpan
      ).reverse();

      expect(secondLastBuckets.y).toBe(lastBucket.y);
      expect(secondLastBuckets.y0).toBe(lastBucket.y0);
      expect(lastBucket.x - secondLastBuckets.x).toBeLessThanOrEqual(
        bucketSpan
      );
    });
  });
});
