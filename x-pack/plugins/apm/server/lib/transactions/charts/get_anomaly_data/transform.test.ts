/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESResponse } from './fetcher';
import { mlAnomalyResponse } from './mock-responses/mlAnomalyResponse';
import { anomalySeriesTransform, replaceFirstAndLastBucket } from './transform';

describe('anomalySeriesTransform', () => {
  it('should match snapshot', () => {
    const getMlBucketSize = 10;
    const bucketSize = 5;
    const timeSeriesDates = [10000, 25000];
    const anomalySeries = anomalySeriesTransform(
      mlAnomalyResponse,
      getMlBucketSize,
      bucketSize,
      timeSeriesDates
    );
    expect(anomalySeries).toMatchSnapshot();
  });

  describe('anomalyScoreSeries', () => {
    it('should only returns bucket within range and above threshold', () => {
      const esResponse = getESResponse([
        {
          key: 0,
          anomaly_score: { value: 90 }
        },
        {
          key: 5000,
          anomaly_score: { value: 0 }
        },
        {
          key: 10000,
          anomaly_score: { value: 90 }
        },
        {
          key: 15000,
          anomaly_score: { value: 0 }
        },
        {
          key: 20000,
          anomaly_score: { value: 90 }
        }
      ]);

      const getMlBucketSize = 5;
      const bucketSize = 5;
      const timeSeriesDates = [5000, 15000];
      const anomalySeries = anomalySeriesTransform(
        esResponse,
        getMlBucketSize,
        bucketSize,
        timeSeriesDates
      );

      const buckets = anomalySeries!.anomalyScore;
      expect(buckets).toEqual([{ x0: 10000, x: 15000 }]);
    });

    it('should decrease the x-value to avoid going beyond last date', () => {
      const esResponse = getESResponse([
        {
          key: 0,
          anomaly_score: { value: 0 }
        },
        {
          key: 5000,
          anomaly_score: { value: 90 }
        }
      ]);

      const getMlBucketSize = 10;
      const bucketSize = 5;
      const timeSeriesDates = [0, 10000];
      const anomalySeries = anomalySeriesTransform(
        esResponse,
        getMlBucketSize,
        bucketSize,
        timeSeriesDates
      );

      const buckets = anomalySeries!.anomalyScore;
      expect(buckets).toEqual([{ x0: 5000, x: 10000 }]);
    });
  });

  describe('anomalyBoundariesSeries', () => {
    it('should trim buckets to time range', () => {
      const esResponse = getESResponse([
        {
          key: 0,
          upper: { value: 15 },
          lower: { value: 10 }
        },
        {
          key: 5000,
          upper: { value: 25 },
          lower: { value: 20 }
        },
        {
          key: 10000,
          upper: { value: 35 },
          lower: { value: 30 }
        },
        {
          key: 15000,
          upper: { value: 45 },
          lower: { value: 40 }
        }
      ]);

      const mlBucketSize = 10;
      const bucketSize = 5;
      const timeSeriesDates = [5000, 10000];
      const anomalySeries = anomalySeriesTransform(
        esResponse,
        mlBucketSize,
        bucketSize,
        timeSeriesDates
      );

      const buckets = anomalySeries!.anomalyBoundaries;
      expect(buckets).toEqual([
        { x: 5000, y: 25, y0: 20 },
        { x: 10000, y: 35, y0: 30 }
      ]);
    });

    it('should replace first bucket in range', () => {
      const esResponse = getESResponse([
        {
          key: 0,
          anomaly_score: { value: 0 },
          upper: { value: 15 },
          lower: { value: 10 }
        },
        {
          key: 5000,
          anomaly_score: { value: 0 },
          upper: { value: null },
          lower: { value: null }
        },
        {
          key: 10000,
          anomaly_score: { value: 0 },
          upper: { value: 25 },
          lower: { value: 20 }
        }
      ]);

      const getMlBucketSize = 10;
      const bucketSize = 5;
      const timeSeriesDates = [5000, 10000];
      const anomalySeries = anomalySeriesTransform(
        esResponse,
        getMlBucketSize,
        bucketSize,
        timeSeriesDates
      );

      const buckets = anomalySeries!.anomalyBoundaries;
      expect(buckets).toEqual([
        { x: 5000, y: 15, y0: 10 },
        { x: 10000, y: 25, y0: 20 }
      ]);
    });

    it('should replace last bucket in range', () => {
      const esResponse = getESResponse([
        {
          key: 0,
          anomaly_score: { value: 0 },
          upper: { value: 15 },
          lower: { value: 10 }
        },
        {
          key: 5000,
          anomaly_score: { value: 0 },
          upper: { value: null },
          lower: { value: null }
        },
        {
          key: 10000,
          anomaly_score: { value: 0 },
          upper: { value: null },
          lower: { value: null }
        }
      ]);

      const getMlBucketSize = 10;
      const bucketSize = 5;
      const timeSeriesDates = [5000, 10000];
      const anomalySeries = anomalySeriesTransform(
        esResponse,
        getMlBucketSize,
        bucketSize,
        timeSeriesDates
      );

      const buckets = anomalySeries!.anomalyBoundaries;
      expect(buckets).toEqual([
        { x: 5000, y: 15, y0: 10 },
        { x: 10000, y: 15, y0: 10 }
      ]);
    });
  });
});

describe('replaceFirstAndLastBucket', () => {
  it('should extend the first bucket', () => {
    const buckets = [
      {
        x: 0,
        lower: 10,
        upper: 20
      },
      {
        x: 5,
        lower: null,
        upper: null
      },
      {
        x: 10,
        lower: null,
        upper: null
      },
      {
        x: 15,
        lower: 30,
        upper: 40
      }
    ];

    const timeSeriesDates = [10, 15];
    expect(replaceFirstAndLastBucket(buckets as any, timeSeriesDates)).toEqual([
      { x: 10, lower: 10, upper: 20 },
      { x: 15, lower: 30, upper: 40 }
    ]);
  });

  it('should extend the last bucket', () => {
    const buckets = [
      {
        x: 10,
        lower: 30,
        upper: 40
      },
      {
        x: 15,
        lower: null,
        upper: null
      },
      {
        x: 20,
        lower: null,
        upper: null
      }
    ] as any;

    const timeSeriesDates = [10, 15, 20];
    expect(replaceFirstAndLastBucket(buckets, timeSeriesDates)).toEqual([
      { x: 10, lower: 30, upper: 40 },
      { x: 15, lower: null, upper: null },
      { x: 20, lower: 30, upper: 40 }
    ]);
  });
});

function getESResponse(buckets: any): ESResponse {
  return ({
    took: 3,
    timed_out: false,
    _shards: {
      total: 5,
      successful: 5,
      skipped: 0,
      failed: 0
    },
    hits: {
      total: 10,
      max_score: 0,
      hits: []
    },
    aggregations: {
      ml_avg_response_times: {
        buckets: buckets.map((bucket: any) => {
          return {
            ...bucket,
            lower: { value: bucket?.lower?.value || null },
            upper: { value: bucket?.upper?.value || null },
            anomaly_score: {
              value: bucket?.anomaly_score?.value || null
            }
          };
        })
      }
    }
  } as unknown) as ESResponse;
}
