/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fillMissingChartData, ChartDataWithNullValues } from './fill_missing_chart_data';

const completeData: ChartDataWithNullValues = [
  [1666828800000, 7],
  [1666832400000, 6],
  [1666836000000, 6],
  [1666839600000, 5],
  [1666843200000, 4],
  [1666846800000, 6],
];

describe('buildBaseFilterCriteria', () => {
  it('returns chart data with missing timestamps in middle of dataset filled in to null', () => {
    const dataWithMissingValues: ChartDataWithNullValues = [
      [1666828800000, 7],
      [1666832400000, 6],
      [1666839600000, 5],
      [1666843200000, 4],
      [1666846800000, 6],
    ];
    const expectedData: ChartDataWithNullValues = [
      [1666828800000, 7],
      [1666832400000, 6],
      [1666836000000, null],
      [1666839600000, 5],
      [1666843200000, 4],
      [1666846800000, 6],
    ];
    const dataWithFilledValues = fillMissingChartData(dataWithMissingValues, completeData);

    expect(dataWithFilledValues).toEqual(expectedData);
  });

  it('returns chart data with missing timestamps at start of dataset filled in to null', () => {
    const dataWithMissingValues: ChartDataWithNullValues = [
      [1666832400000, 6],
      [1666836000000, 6],
      [1666839600000, 5],
      [1666843200000, 4],
      [1666846800000, 6],
    ];
    const expectedData: ChartDataWithNullValues = [
      [1666828800000, null],
      [1666832400000, 6],
      [1666836000000, 6],
      [1666839600000, 5],
      [1666843200000, 4],
      [1666846800000, 6],
    ];
    const dataWithFilledValues = fillMissingChartData(dataWithMissingValues, completeData);

    expect(dataWithFilledValues).toEqual(expectedData);
  });

  it('returns chart data with missing timestamps at end of dataset filled in to null', () => {
    const dataWithMissingValues: ChartDataWithNullValues = [
      [1666828800000, 7],
      [1666832400000, 6],
      [1666836000000, 6],
      [1666839600000, 5],
    ];
    const expectedData: ChartDataWithNullValues = [
      [1666828800000, 7],
      [1666832400000, 6],
      [1666836000000, 6],
      [1666839600000, 5],
      [1666843200000, null],
      [1666846800000, null],
    ];
    const dataWithFilledValues = fillMissingChartData(dataWithMissingValues, completeData);

    expect(dataWithFilledValues).toEqual(expectedData);
  });
});
