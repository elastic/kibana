/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { generateSearchSchema, type SearchFilter } from './generate_search_schema';

describe('generateSearchSchema', () => {
  function getTypeName(schema: z.Schema): string | undefined {
    schema = unwrap(schema);

    const typeName =
      'typeName' in schema._def && typeof schema._def.typeName === 'string'
        ? schema._def.typeName
        : undefined;

    return typeName;
  }

  function unwrap(schema: z.Schema) {
    if (schema.isOptional()) {
      return (schema as z.ZodOptional<any>).unwrap();
    }
    return schema;
  }

  it('should generate a schema with query field by default', () => {
    const schema = generateSearchSchema({ filters: [] });
    expect(schema.query).toBeDefined();
    expect(getTypeName(schema.query)).toBe('ZodString');
    expect(schema.query.isOptional()).toBe(true);
  });

  it('should generate schema for keyword filter without predefined values', () => {
    const filters: SearchFilter[] = [
      {
        field: 'status',
        type: 'keyword',
        description: 'Filter by status',
      },
    ];
    const schema = generateSearchSchema({ filters });

    expect(schema.status).toBeDefined();
    expect(getTypeName(schema.status)).toBe('ZodString');
    expect(schema.status.isOptional()).toBe(true);
  });

  it('should generate schema for keyword filter with predefined values', () => {
    const filters: SearchFilter[] = [
      {
        field: 'status',
        type: 'keyword',
        description: 'Filter by status',
        values: ['active', 'inactive', 'pending'],
      },
    ];
    const schema = generateSearchSchema({ filters });

    expect(schema.status).toBeDefined();
    expect(getTypeName(schema.status)).toBe('ZodEnum');
    expect((unwrap(schema.status) as z.ZodEnum<any>).options).toEqual([
      'active',
      'inactive',
      'pending',
    ]);
    expect(schema.status.isOptional()).toBe(true);
  });

  it('should generate schema for date filter', () => {
    const filters: SearchFilter[] = [
      {
        field: 'created_at',
        type: 'date',
        description: 'Filter by creation date',
      },
    ];
    const schema = generateSearchSchema({ filters });

    expect(schema.created_at).toBeDefined();
    expect(getTypeName(schema.created_at)).toBe('ZodString');
    expect(schema.created_at.isOptional()).toBe(true);
  });

  it('should generate schema for boolean filter', () => {
    const filters: SearchFilter[] = [
      {
        field: 'is_active',
        type: 'boolean',
        description: 'Filter by active status',
      },
    ];
    const schema = generateSearchSchema({ filters });

    expect(schema.is_active).toBeDefined();
    expect(getTypeName(schema.is_active)).toBe('ZodBoolean');
    expect(schema.is_active.isOptional()).toBe(true);
  });

  it('should combine multiple filters in the schema', () => {
    const filters: SearchFilter[] = [
      {
        field: 'status',
        type: 'keyword',
        description: 'Filter by status',
        values: ['active', 'inactive'],
      },
      {
        field: 'created_at',
        type: 'date',
        description: 'Filter by creation date',
      },
      {
        field: 'is_active',
        type: 'boolean',
        description: 'Filter by active status',
      },
    ];
    const schema = generateSearchSchema({ filters });

    expect(schema.query).toBeDefined();
    expect(schema.status).toBeDefined();
    expect(schema.created_at).toBeDefined();
    expect(schema.is_active).toBeDefined();
  });

  it('should handle empty values array for keyword filter', () => {
    const filters: SearchFilter[] = [
      {
        field: 'status',
        type: 'keyword',
        description: 'Filter by status',
        values: [],
      },
    ];
    const schema = generateSearchSchema({ filters });

    expect(schema.status).toBeDefined();
    expect(getTypeName(schema.status)).toBe('ZodString');
    expect(schema.status.isOptional()).toBe(true);
  });
});
