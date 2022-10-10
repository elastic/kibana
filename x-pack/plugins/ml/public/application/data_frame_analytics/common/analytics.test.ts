/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAnalysisType, getValuesFromResponse, isOutlierAnalysis } from './analytics';

describe('Data Frame Analytics: Analytics utils', () => {
  test('getAnalysisType()', () => {
    const outlierAnalysis = { outlier_detection: {} };
    expect(getAnalysisType(outlierAnalysis)).toBe('outlier_detection');

    const regressionAnalysis = { regression: {} };
    // @ts-expect-error incomplete regression analysis
    expect(getAnalysisType(regressionAnalysis)).toBe('regression');

    // test against a job type that does not exist yet.
    const otherAnalysis = { other: {} };
    // @ts-expect-error unkown analysis type
    expect(getAnalysisType(otherAnalysis)).toBe('other');

    // if the analysis object has a shape that is not just a single property,
    // the job type will be returned as 'unknown'.
    const unknownAnalysis = { outlier_detection: {}, regression: {} };
    // @ts-expect-error unkown analysis type
    expect(getAnalysisType(unknownAnalysis)).toBe('unknown');
  });

  test('isOutlierAnalysis()', () => {
    const outlierAnalysis = { outlier_detection: {} };
    expect(isOutlierAnalysis(outlierAnalysis)).toBe(true);

    const regressionAnalysis = { regression: {} };
    expect(isOutlierAnalysis(regressionAnalysis)).toBe(false);

    const unknownAnalysis = { outlier_detection: {}, regression: {} };
    expect(isOutlierAnalysis(unknownAnalysis)).toBe(false);
  });

  test('getValuesFromResponse()', () => {
    const evalResponse: any = {
      regression: {
        huber: { value: 'NaN' },
        mse: { value: 7.514953437693147 },
        msle: { value: 'Infinity' },
        r_squared: { value: 0.9837343227799651 },
      },
    };
    const expectedResponse = {
      mse: 7.51,
      msle: 'Infinity',
      huber: 'NaN',
      r_squared: 0.984,
    };
    expect(getValuesFromResponse(evalResponse)).toEqual(expectedResponse);
  });
});
