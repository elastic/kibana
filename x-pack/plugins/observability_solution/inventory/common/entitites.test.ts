/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isLeft, isRight } from 'fp-ts/lib/Either';
import { type EntityType, entityTypesRt } from './entities';

const validate = (input: unknown) => entityTypesRt.decode(input);

describe('entityTypesRt codec', () => {
  it('should validate a valid string of entity types', () => {
    const input = 'service,host,container';
    const result = validate(input);
    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right).toEqual(['service', 'host', 'container']);
    }
  });

  it('should validate a valid array of entity types', () => {
    const input = ['service', 'host', 'container'];
    const result = validate(input);
    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right).toEqual(['service', 'host', 'container']);
    }
  });

  it('should fail validation when the string contains invalid entity types', () => {
    const input = 'service,invalidType,host';
    const result = validate(input);
    expect(isLeft(result)).toBe(true);
  });

  it('should fail validation when the array contains invalid entity types', () => {
    const input = ['service', 'invalidType', 'host'];
    const result = validate(input);
    expect(isLeft(result)).toBe(true);
  });

  it('should fail validation when input is not a string or array', () => {
    const input = 123;
    const result = validate(input);
    expect(isLeft(result)).toBe(true);
  });

  it('should fail validation when the array contains non-string elements', () => {
    const input = ['service', 123, 'host'];
    const result = validate(input);
    expect(isLeft(result)).toBe(true);
  });

  it('should validate an empty string as an empty array', () => {
    const input = '';
    const result = validate(input);
    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right).toEqual([]);
    }
  });

  it('should validate an empty array as valid', () => {
    const input: unknown[] = [];
    const result = validate(input);
    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right).toEqual([]);
    }
  });

  it('should fail validation when the string contains only commas', () => {
    const input = ',,,';
    const result = validate(input);
    expect(isLeft(result)).toBe(true);
  });

  it('should fail validation for partial valid entities in a string', () => {
    const input = 'service,invalidType';
    const result = validate(input);
    expect(isLeft(result)).toBe(true);
  });

  it('should fail validation for partial valid entities in an array', () => {
    const input = ['service', 'invalidType'];
    const result = validate(input);
    expect(isLeft(result)).toBe(true);
  });

  it('should serialize a valid array back to a string', () => {
    const input: EntityType[] = ['service', 'host'];
    const serialized = entityTypesRt.encode(input);
    expect(serialized).toBe('service,host');
  });

  it('should serialize an empty array back to an empty string', () => {
    const input: EntityType[] = [];
    const serialized = entityTypesRt.encode(input);
    expect(serialized).toBe('');
  });
});
