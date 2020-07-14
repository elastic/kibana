/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESQuery } from '../../../common/typed_json';

import { createFilter } from './helpers';

describe('Helpers', () => {
  describe('#createFilter', () => {
    test('if it is a string it returns untouched', () => {
      const filter = createFilter('even invalid strings return the same');
      expect(filter).toBe('even invalid strings return the same');
    });

    test('if it is an ESQuery object it will be returned as a string', () => {
      const query: ESQuery = { term: { 'host.id': 'host-value' } };
      const filter = createFilter(query);
      expect(filter).toBe(JSON.stringify(query));
    });

    test('if it is undefined, then undefined is returned', () => {
      const filter = createFilter(undefined);
      expect(filter).toBe(undefined);
    });
  });
});
