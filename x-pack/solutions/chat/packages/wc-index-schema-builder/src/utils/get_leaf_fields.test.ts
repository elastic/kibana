/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { getLeafFields, MappingField } from './get_leaf_fields';

describe('getLeafFields', () => {
  test('should return empty array when mappings has no properties', () => {
    const mappings: MappingTypeMapping = {
      properties: {},
    };

    const result = getLeafFields({ mappings });
    expect(result).toEqual([]);
  });

  test('should extract leaf fields at root level', () => {
    const mappings: MappingTypeMapping = {
      properties: {
        title: { type: 'text' },
        age: { type: 'integer' },
        enabled: { type: 'boolean' },
      },
    };

    const expected: MappingField[] = [
      { path: 'title', type: 'text' },
      { path: 'age', type: 'integer' },
      { path: 'enabled', type: 'boolean' },
    ];

    const result = getLeafFields({ mappings });
    expect(result).toEqual(expect.arrayContaining(expected));
    expect(result.length).toBe(expected.length);
  });

  test('should extract nested fields with correct paths', () => {
    const mappings: MappingTypeMapping = {
      properties: {
        user: {
          properties: {
            firstName: { type: 'text' },
            lastName: { type: 'text' },
            address: {
              properties: {
                city: { type: 'keyword' },
                zipCode: { type: 'keyword' },
              },
            },
          },
        },
      },
    };

    const expected: MappingField[] = [
      { path: 'user.firstName', type: 'text' },
      { path: 'user.lastName', type: 'text' },
      { path: 'user.address.city', type: 'keyword' },
      { path: 'user.address.zipCode', type: 'keyword' },
    ];

    const result = getLeafFields({ mappings });
    expect(result).toEqual(expect.arrayContaining(expected));
    expect(result.length).toBe(expected.length);
  });

  test('should handle a mix of leaf fields and nested objects', () => {
    const mappings: MappingTypeMapping = {
      properties: {
        id: { type: 'keyword' },
        content: { type: 'text' },
        metadata: {
          properties: {
            created: { type: 'date' },
            author: {
              properties: {
                id: { type: 'keyword' },
                name: { type: 'text' },
              },
            },
          },
        },
        tags: { type: 'keyword' },
      },
    };

    const expected: MappingField[] = [
      { path: 'id', type: 'keyword' },
      { path: 'content', type: 'text' },
      { path: 'metadata.created', type: 'date' },
      { path: 'metadata.author.id', type: 'keyword' },
      { path: 'metadata.author.name', type: 'text' },
      { path: 'tags', type: 'keyword' },
    ];

    const result = getLeafFields({ mappings });
    expect(result).toEqual(expect.arrayContaining(expected));
    expect(result.length).toBe(expected.length);
  });

  test('should handle mappings with undefined properties', () => {
    const mappings: MappingTypeMapping = {};

    const result = getLeafFields({ mappings });
    expect(result).toEqual([]);
  });
});
