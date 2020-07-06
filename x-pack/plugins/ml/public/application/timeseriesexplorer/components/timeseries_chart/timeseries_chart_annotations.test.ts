/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import mockAnnotationsOverlap from './__mocks__/mock_annotations_overlap.json';

import { getAnnotationLevels } from './timeseries_chart_annotations';

describe('Timeseries Chart Annotations: getAnnotationLevels()', () => {
  test('getAnnotationLevels()', () => {
    const levels = getAnnotationLevels(mockAnnotationsOverlap);
    expect(levels).toEqual({ A: 0, B: 1, C: 2, D: 2 });
  });
});
