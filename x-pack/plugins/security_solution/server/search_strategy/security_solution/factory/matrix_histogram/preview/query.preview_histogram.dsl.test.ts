/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPreviewHistogramQuery } from './query.preview_histogram.dsl';
import { mockOptions, expectedDsl } from './__mocks__/';

describe('buildAlertsHistogramQuery', () => {
  test('build query from options correctly', () => {
    expect(buildPreviewHistogramQuery(mockOptions)).toEqual(expectedDsl);
  });
});
