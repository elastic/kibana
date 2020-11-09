/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { buildEventsHistogramQuery } from './query.events_histogram.dsl';
import {
  mockOptions,
  expectedDsl,
  expectedThresholdDsl,
  expectedThresholdMissingFieldDsl,
} from './__mocks__/';

describe('buildEventsHistogramQuery', () => {
  test('build query from options correctly', () => {
    expect(buildEventsHistogramQuery(mockOptions)).toEqual(expectedDsl);
  });

  test('builds query with just min doc if "threshold.field" is undefined and "missing" param included', () => {
    expect(
      buildEventsHistogramQuery({ ...mockOptions, threshold: { field: undefined, value: 200 } })
    ).toEqual(expectedThresholdMissingFieldDsl);
  });

  test('builds query with specified threshold field and without "missing" param if "threshold.field" is defined', () => {
    expect(
      buildEventsHistogramQuery({ ...mockOptions, threshold: { field: 'host.name', value: 200 } })
    ).toEqual(expectedThresholdDsl);
  });
});
