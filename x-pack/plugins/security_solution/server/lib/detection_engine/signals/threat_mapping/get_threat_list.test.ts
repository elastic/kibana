/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSortWithTieBreaker } from './get_threat_list';

describe('get_threat_signals', () => {
  describe('getSortWithTieBreaker', () => {
    test('it should return sort field of just timestamp if given no sort order', () => {
      const sortOrder = getSortWithTieBreaker({
        sortField: undefined,
        sortOrder: undefined,
        index: ['index-123'],
        listItemIndex: 'list-index-123',
      });
      expect(sortOrder).toEqual([{ '@timestamp': 'desc' }]);
    });

    test('it should return sort field of just tie_breaker_id if given no sort order for a list item index', () => {
      const sortOrder = getSortWithTieBreaker({
        sortField: undefined,
        sortOrder: undefined,
        index: ['list-item-index-123'],
        listItemIndex: 'list-item-index-123',
      });
      expect(sortOrder).toEqual([{ tie_breaker_id: 'asc' }]);
    });

    test('it should return sort field of timestamp with desc even if sortOrder is changed as it is hard wired in', () => {
      const sortOrder = getSortWithTieBreaker({
        sortField: undefined,
        sortOrder: 'desc',
        index: ['index-123'],
        listItemIndex: 'list-index-123',
      });
      expect(sortOrder).toEqual([{ '@timestamp': 'desc' }]);
    });

    test('it should return sort field of tie_breaker_id with asc even if sortOrder is changed as it is hard wired in for a list item index', () => {
      const sortOrder = getSortWithTieBreaker({
        sortField: undefined,
        sortOrder: 'desc',
        index: ['list-index-123'],
        listItemIndex: 'list-index-123',
      });
      expect(sortOrder).toEqual([{ tie_breaker_id: 'asc' }]);
    });

    test('it should return sort field of an extra field if given one', () => {
      const sortOrder = getSortWithTieBreaker({
        sortField: 'some-field',
        sortOrder: undefined,
        index: ['index-123'],
        listItemIndex: 'list-index-123',
      });
      expect(sortOrder).toEqual([{ 'some-field': 'asc', '@timestamp': 'desc' }]);
    });

    test('it should return sort field of an extra field if given one for a list item index', () => {
      const sortOrder = getSortWithTieBreaker({
        sortField: 'some-field',
        sortOrder: undefined,
        index: ['list-index-123'],
        listItemIndex: 'list-index-123',
      });
      expect(sortOrder).toEqual([{ 'some-field': 'asc', tie_breaker_id: 'asc' }]);
    });

    test('it should return sort field of desc if given one', () => {
      const sortOrder = getSortWithTieBreaker({
        sortField: 'some-field',
        sortOrder: 'desc',
        index: ['index-123'],
        listItemIndex: 'list-index-123',
      });
      expect(sortOrder).toEqual([{ 'some-field': 'desc', '@timestamp': 'desc' }]);
    });

    test('it should return sort field of desc if given one for a list item index', () => {
      const sortOrder = getSortWithTieBreaker({
        sortField: 'some-field',
        sortOrder: 'desc',
        index: ['list-index-123'],
        listItemIndex: 'list-index-123',
      });
      expect(sortOrder).toEqual([{ 'some-field': 'desc', tie_breaker_id: 'asc' }]);
    });
  });
});
