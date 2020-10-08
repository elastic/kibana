/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { authenticationsMatrixHistogramConfig } from '.';
import { buildAuthenticationsHistogramQuery } from './query.authentications_histogram.dsl';

jest.mock('./query.authentications_histogram.dsl', () => ({
  buildAuthenticationsHistogramQuery: jest.fn(),
}));

describe('authenticationsMatrixHistogramConfig', () => {
  test('should export authenticationsMatrixHistogramConfig corrrectly', () => {
    expect(authenticationsMatrixHistogramConfig).toEqual({
      aggName: 'aggregations.eventActionGroup.buckets',
      parseKey: 'events.buckets',
      buildDsl: buildAuthenticationsHistogramQuery,
    });
  });
});
