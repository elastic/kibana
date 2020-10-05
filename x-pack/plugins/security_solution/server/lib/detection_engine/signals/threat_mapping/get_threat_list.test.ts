/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSortWithTieBreaker } from './get_threat_list';

describe('get_threat_signals', () => {
  describe('getSortWithTieBreaker', () => {
    test('it should return sort field of just timestamp if given no sort order', () => {
      const sortOrder = getSortWithTieBreaker({ sortField: undefined, sortOrder: undefined });
      expect(sortOrder).toEqual([{ '@timestamp': 'asc' }]);
    });

    test('it should return sort field of timestamp with asc even if sortOrder is changed as it is hard wired in', () => {
      const sortOrder = getSortWithTieBreaker({ sortField: undefined, sortOrder: 'desc' });
      expect(sortOrder).toEqual([{ '@timestamp': 'asc' }]);
    });

    test('it should return sort field of an extra field if given one', () => {
      const sortOrder = getSortWithTieBreaker({ sortField: 'some-field', sortOrder: undefined });
      expect(sortOrder).toEqual([{ 'some-field': 'asc', '@timestamp': 'asc' }]);
    });

    test('it should return sort field of desc if given one', () => {
      const sortOrder = getSortWithTieBreaker({ sortField: 'some-field', sortOrder: 'desc' });
      expect(sortOrder).toEqual([{ 'some-field': 'desc', '@timestamp': 'asc' }]);
    });
  });
});
