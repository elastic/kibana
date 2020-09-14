/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { eventsMatrixHistogramConfig } from '.';
import { buildEventsHistogramQuery } from './query.events_histogram.dsl';

jest.mock('./query.events_histogram.dsl.ts', () => ({
  buildEventsHistogramQuery: jest.fn(),
}));

describe('eventsMatrixHistogramConfig', () => {
  test('should export eventsMatrixHistogramConfig corrrectly', () => {
    expect(eventsMatrixHistogramConfig).toEqual({
      aggName: 'aggregations.eventActionGroup.buckets',
      parseKey: 'events.buckets',
      buildDsl: buildEventsHistogramQuery,
    });
  });
});
