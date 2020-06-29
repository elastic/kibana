/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getPlaceholderText } from './helpers';

describe('helpers', () => {
  describe('getPlaceholderText', () => {
    test('it returns a placeholder applicable to filter (AND) mode', () => {
      expect(getPlaceholderText('filter')).toEqual('Filter events');
    });

    test('it returns a placeholder applicable to search (OR) mode', () => {
      expect(getPlaceholderText('search')).toEqual('Search events');
    });
  });
});
