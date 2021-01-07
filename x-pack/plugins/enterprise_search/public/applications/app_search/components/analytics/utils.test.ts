/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { convertToChartsData } from './utils';

describe('convertToChartsData', () => {
  it('converts server-side analytics data into an array of objects that Elastic Charts can consume', () => {
    expect(
      convertToChartsData({
        startDate: '1970-01-01',
        data: [0, 1, 5, 50, 25],
      })
    ).toEqual([
      { x: '1970-01-01', y: 0 },
      { x: '1970-01-02', y: 1 },
      { x: '1970-01-03', y: 5 },
      { x: '1970-01-04', y: 50 },
      { x: '1970-01-05', y: 25 },
    ]);
  });
});
