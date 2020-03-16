/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getMetricChangeDescription } from './metric_change_description';

describe('ML - metricChangeDescription formatter', () => {
  test('returns correct icon and message if actual > typical', () => {
    expect(getMetricChangeDescription(1.01, 1)).toEqual({
      iconType: 'sortUp',
      message: 'Unusually high',
    });
    expect(getMetricChangeDescription(1.123, 1)).toEqual({
      iconType: 'sortUp',
      message: '1.1x higher',
    });
    expect(getMetricChangeDescription(2, 1)).toEqual({ iconType: 'sortUp', message: '2x higher' });
    expect(getMetricChangeDescription(9.5, 1)).toEqual({
      iconType: 'sortUp',
      message: '10x higher',
    });
    expect(getMetricChangeDescription(1000, 1)).toEqual({
      iconType: 'sortUp',
      message: 'More than 100x higher',
    });
    expect(getMetricChangeDescription(1, 0)).toEqual({
      iconType: 'sortUp',
      message: 'Unexpected non-zero value',
    });
  });

  test('returns correct icon and message if actual < typical', () => {
    expect(getMetricChangeDescription(1, 1.01)).toEqual({
      iconType: 'sortDown',
      message: 'Unusually low',
    });
    expect(getMetricChangeDescription(1, 1.123)).toEqual({
      iconType: 'sortDown',
      message: '1.1x lower',
    });
    expect(getMetricChangeDescription(1, 2)).toEqual({ iconType: 'sortDown', message: '2x lower' });
    expect(getMetricChangeDescription(1, 9.5)).toEqual({
      iconType: 'sortDown',
      message: '10x lower',
    });
    expect(getMetricChangeDescription(1, 1000)).toEqual({
      iconType: 'sortDown',
      message: 'More than 100x lower',
    });
    expect(getMetricChangeDescription(0, 1)).toEqual({
      iconType: 'sortDown',
      message: 'Unexpected zero value',
    });
  });
});
