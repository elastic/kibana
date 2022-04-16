/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEventsHistogramQuery } from './query.events_histogram.dsl';
import {
  mockOptions,
  expectedDsl,
  expectedThresholdDsl,
  expectedThresholdMissingFieldDsl,
  expectedThresholdWithCardinalityDsl,
  expectedThresholdGroupWithCardinalityDsl,
  expectedIpIncludingMissingDataDsl,
  expectedIpNotIncludingMissingDataDsl,
} from './__mocks__';

describe('buildEventsHistogramQuery', () => {
  test('build query from options correctly', () => {
    expect(buildEventsHistogramQuery(mockOptions)).toEqual(expectedDsl);
  });

  test('builds query with just min doc if "threshold.field" is empty array and "missing" param included', () => {
    expect(
      buildEventsHistogramQuery({
        ...mockOptions,
        threshold: { field: [], value: '200', cardinality: { field: [], value: '0' } },
      })
    ).toEqual(expectedThresholdMissingFieldDsl);
  });

  test('builds query with specified threshold fields and without "missing" param if "threshold.field" is multi field', () => {
    expect(
      buildEventsHistogramQuery({
        ...mockOptions,
        threshold: {
          field: ['host.name', 'agent.name'],
          value: '200',
        },
      })
    ).toEqual(expectedThresholdDsl);
  });

  test('builds query with specified threshold cardinality if defined', () => {
    expect(
      buildEventsHistogramQuery({
        ...mockOptions,
        threshold: {
          field: [],
          value: '200',
          cardinality: { field: ['agent.name'], value: '10' },
        },
      })
    ).toEqual(expectedThresholdWithCardinalityDsl);
  });

  test('builds query with specified threshold group fields and cardinality if defined', () => {
    expect(
      buildEventsHistogramQuery({
        ...mockOptions,
        threshold: {
          field: ['host.name', 'agent.name'],
          value: '200',
          cardinality: { field: ['agent.name'], value: '10' },
        },
      })
    ).toEqual(expectedThresholdGroupWithCardinalityDsl);
  });

  test('builds query with stack by ip and including missing data', () => {
    expect(
      buildEventsHistogramQuery({
        ...mockOptions,
        stackByField: 'source.ip',
      })
    ).toEqual(expectedIpIncludingMissingDataDsl);
  });

  test('builds query with stack by ip and not including missing data', () => {
    expect(
      buildEventsHistogramQuery({
        ...mockOptions,
        includeMissingData: false,
        stackByField: 'source.ip',
      })
    ).toEqual(expectedIpNotIncludingMissingDataDsl);
  });
});
