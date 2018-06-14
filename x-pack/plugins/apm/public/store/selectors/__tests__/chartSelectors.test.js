/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getAnomalyScore } from '../chartSelectors';

describe('chartSelectors', () => {
  it('getAnomalyScore', () => {
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

    expect(getAnomalyScore(dates, buckets, 1)).toEqual([
      { x: 1000, y: 1 },
      { x: 2000, y: 1 },
      { x: 3000 },
      { x: 5000, y: 1 },
      { x: 6000, y: 1 },
      { x: 7000 }
    ]);
  });

  it('getResponseTimeSeries', () => {});
});
