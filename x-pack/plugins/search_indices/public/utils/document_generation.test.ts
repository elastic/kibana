/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';

import { generateSampleDocument } from './document_generation';

describe('document generation util', () => {
  it('should generate a sample document for text and keyword fields', () => {
    const mapping: Record<string, MappingProperty> = {
      body: { type: 'semantic_text', inference_id: '.elser_model_2' },
      title: { type: 'text' },
      tags: { type: 'keyword' },
    };

    const result = generateSampleDocument(mapping);

    expect(result).toEqual({
      title: 'Sample text for title',
      tags: 'sample-keyword-tags',
      body: 'Sample text for body',
    });
  });

  it('should support providing sample text', () => {
    const mapping: Record<string, MappingProperty> = {
      body: { type: 'semantic_text', inference_id: '.elser_model_2' },
      title: { type: 'text' },
    };

    const result = generateSampleDocument(mapping, 'Testing sample text!');

    expect(result).toEqual({
      title: 'Testing sample text!',
      body: 'Testing sample text!',
    });
  });

  it('should generate a sample document for integer and float fields', () => {
    const mapping: Record<string, MappingProperty> = {
      age: { type: 'integer' },
      rating: { type: 'float' },
      price: { type: 'double' },
    };

    const result = generateSampleDocument(mapping);

    expect(Number.isInteger(result.age)).toBe(true);
    expect(typeof result.rating).toBe('number');
    expect(typeof result.price).toBe('number');
  });

  it('should generate a sample document for boolean and date fields', () => {
    const mapping: Record<string, MappingProperty> = {
      isActive: { type: 'boolean' },
      createdAt: { type: 'date' },
    };

    const result = generateSampleDocument(mapping);

    expect(typeof result.isActive).toBe('boolean');
    expect(new Date(result.createdAt as string).toISOString()).toBe(result.createdAt);
  });

  it('should generate a sample document for geo_point fields', () => {
    const mapping: Record<string, MappingProperty> = {
      location: { type: 'geo_point' },
    };

    const result = generateSampleDocument(mapping);

    expect(result.location).toEqual({
      lat: 40.7128,
      lon: -74.006,
    });
  });

  it('should generate a sample document for nested fields', () => {
    const mapping: Record<string, MappingProperty> = {
      user: {
        type: 'nested',
        properties: {
          name: { type: 'text' },
          age: { type: 'integer' },
        },
      },
    };

    const result = generateSampleDocument(mapping);

    expect(result.user).toEqual([
      {
        name: 'Sample text for name',
        age: expect.any(Number),
      },
    ]);
  });

  it('should generate a sample document for object fields', () => {
    const mapping: Record<string, MappingProperty> = {
      address: {
        type: 'object',
        properties: {
          city: { type: 'text' },
          postalCode: { type: 'integer' },
        },
      },
    };

    const result = generateSampleDocument(mapping);

    expect(result.address).toEqual({
      city: 'Sample text for city',
      postalCode: expect.any(Number),
    });
  });

  it('should generate a sample document for dense_vector fields', () => {
    const mapping: Record<string, MappingProperty> = {
      embedding: { type: 'dense_vector', dims: 512 },
    };

    const result = generateSampleDocument(mapping);

    expect(Array.isArray(result.embedding)).toBe(true);
    expect((result.embedding as number[]).length!).toBe(11);
    expect((result.embedding as number[])[10]).toBe('...');
  });

  it('should generate a sample document for sparse_vector fields', () => {
    const mapping: Record<string, MappingProperty> = {
      vector: { type: 'sparse_vector' },
    };

    const result = generateSampleDocument(mapping);

    expect(result.vector).toBeDefined();
    for (const [key, value] of Object.entries(result.vector!)) {
      expect(key).toEqual(expect.any(String));
      expect(value).toEqual(expect.any(Number));
    }
  });

  it('should handle unknown mapping types by setting null', () => {
    const mapping: Record<string, MappingProperty> = {
      unknownField: { type: 'unknown' as any },
    };

    const result = generateSampleDocument(mapping);

    expect(result.unknownField).toBeNull();
  });
});
