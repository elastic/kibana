/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getValuesFromResponse } from './analytics';

describe('Data Frame Analytics: Analytics utils', () => {
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
