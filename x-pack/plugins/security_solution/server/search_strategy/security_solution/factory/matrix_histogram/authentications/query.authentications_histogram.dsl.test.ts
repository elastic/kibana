/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { buildAuthenticationsHistogramQuery } from './query.authentications_histogram.dsl';
import { mockOptions, expectedDsl } from './__mocks__/';

describe('buildAuthenticationsHistogramQuery', () => {
  test('build query from options correctly', () => {
    expect(buildAuthenticationsHistogramQuery(mockOptions)).toEqual(expectedDsl);
  });
});
