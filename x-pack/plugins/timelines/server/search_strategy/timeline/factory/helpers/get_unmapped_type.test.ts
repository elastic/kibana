/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getUnmappedType } from './get_unmapped_type';

describe('getUnmappedType', () => {
  it('should fallback to keyword for an unknown type', () => {
    const fakeType = 'fake.type';
    const mappingType = getUnmappedType(fakeType);
    expect(mappingType).toBe('keyword');
  });

  it('should return date for date types', () => {
    const dateType = 'date';
    const mappingType = getUnmappedType(dateType);
    expect(mappingType).toBe('date');
  });

  it('should return ip for ip types', () => {
    const ipType = 'ip';
    const mappingType = getUnmappedType(ipType);
    expect(mappingType).toBe('ip');
  });

  it('should return long for number types', () => {
    const numberType = 'number';
    const mappingType = getUnmappedType(numberType);
    expect(mappingType).toBe('long');
  });

  it('should return boolean for boolean types', () => {
    const booleanType = 'boolean';
    const mappingType = getUnmappedType(booleanType);
    expect(mappingType).toBe('boolean');
  });
});
