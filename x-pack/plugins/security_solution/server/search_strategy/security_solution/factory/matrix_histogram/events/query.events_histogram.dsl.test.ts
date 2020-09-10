/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { buildEventsHistogramQuery } from './query.events_histogram.dsl';
import { mockOptions, expectedDsl } from './__mocks__/';

describe('buildEventsHistogramQuery', () => {
  test('build query from options correctly', () => {
    expect(buildEventsHistogramQuery(mockOptions)).toEqual(expectedDsl);
  });
});
