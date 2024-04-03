/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getItemsFilteredBySearchQuery } from './table_search_bar';

describe('getItemsFilteredBySearchQuery', () => {
  const sampleItems = [
    { name: 'Apple', category: 'Fruit' },
    { name: 'Banana', category: 'Fruit' },
    { name: 'Carrot', category: 'Vegetable' },
  ];

  it('should filter items based on full match', () => {
    const result = getItemsFilteredBySearchQuery({
      items: sampleItems,
      fieldsToSearch: ['name'],
      searchQuery: 'Banana',
    });
    expect(result).toEqual([{ name: 'Banana', category: 'Fruit' }]);
  });

  it('should filter items based on partial match', () => {
    const result = getItemsFilteredBySearchQuery({
      items: sampleItems,
      fieldsToSearch: ['name'],
      searchQuery: 'car',
    });
    expect(result).toEqual([{ name: 'Carrot', category: 'Vegetable' }]);
  });

  it('should be case-insensitive', () => {
    const result = getItemsFilteredBySearchQuery({
      items: sampleItems,
      fieldsToSearch: ['category'],
      searchQuery: 'fruit',
    });
    expect(result).toEqual([
      { name: 'Apple', category: 'Fruit' },
      { name: 'Banana', category: 'Fruit' },
    ]);
  });

  it('should handle undefined field values', () => {
    const itemsWithUndefined = [
      { name: 'Apple', category: 'Fruit' },
      { name: 'Banana', category: undefined },
    ];
    const result = getItemsFilteredBySearchQuery({
      items: itemsWithUndefined,
      fieldsToSearch: ['category'],
      searchQuery: 'fruit',
    });
    expect(result).toEqual([{ name: 'Apple', category: 'Fruit' }]);
  });

  it('should return an empty array if no match is found', () => {
    const result = getItemsFilteredBySearchQuery({
      items: sampleItems,
      fieldsToSearch: ['name'],
      searchQuery: 'Grapes',
    });
    expect(result).toEqual([]);
  });
});
