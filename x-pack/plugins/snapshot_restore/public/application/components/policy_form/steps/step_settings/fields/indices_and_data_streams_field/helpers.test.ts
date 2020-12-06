/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { determineListMode } from './helpers';

describe('helpers', () => {
  describe('determineListMode', () => {
    test('list length (> 100)', () => {
      expect(
        determineListMode({
          indices: Array.from(Array(101).keys()).map(String),
          dataStreams: [],
          configuredIndices: undefined,
        })
      ).toBe('custom');

      // The length of indices and data streams are cumulative
      expect(
        determineListMode({
          indices: Array.from(Array(51).keys()).map(String),
          dataStreams: Array.from(Array(51).keys()).map(String),
          configuredIndices: undefined,
        })
      ).toBe('custom');

      // Other values should result in list mode
      expect(
        determineListMode({
          indices: [],
          dataStreams: [],
          configuredIndices: undefined,
        })
      ).toBe('list');
    });

    test('configured indices is a string', () => {
      expect(
        determineListMode({
          indices: [],
          dataStreams: [],
          configuredIndices: 'test',
        })
      ).toBe('custom');
    });

    test('configured indices not included in current indices and data streams', () => {
      expect(
        determineListMode({
          indices: ['a'],
          dataStreams: ['b'],
          configuredIndices: ['a', 'b', 'c'],
        })
      ).toBe('custom');
    });

    test('configured indices included in current indices and data streams', () => {
      expect(
        determineListMode({
          indices: ['a'],
          dataStreams: ['b'],
          configuredIndices: ['a', 'b'],
        })
      ).toBe('list');
    });
  });
});
