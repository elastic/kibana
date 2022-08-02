/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { eventsMatrixHistogramConfig } from '.';
import { buildEventsHistogramQuery } from './query.events_histogram.dsl';

jest.mock('./query.events_histogram.dsl', () => ({
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
