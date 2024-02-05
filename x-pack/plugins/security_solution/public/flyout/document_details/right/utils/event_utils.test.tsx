/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isEcsAllowedValue, getCategoryTitle } from './event_utils';

describe('test isEcsAllowedValue', () => {
  it('should return if the value is an allowed value given by field name', () => {
    expect(isEcsAllowedValue('event.kind', 'event')).toBe(true);
    expect(isEcsAllowedValue('event.kind', 'not ecs')).toBe(false);
    expect(isEcsAllowedValue('event.category', 'not ecs')).toBe(false);
    expect(isEcsAllowedValue('not ecs field', 'file')).toBe(false);
  });
});

describe('test getCategoryTitle', () => {
  it('should return title name given by category type', () => {
    const getFieldsData = (field: string) => {
      switch (field) {
        case 'process.name':
          return 'test.exe';
        case 'host.name':
          return 'host1';
      }
    };
    expect(getCategoryTitle(getFieldsData, 'process')).toBe('test.exe');
    expect(getCategoryTitle(getFieldsData, 'host')).toBe('host1');
  });

  it('should return default title if field is not found', () => {
    const getFieldsData = (field: string) => {
      switch (field) {
        case 'process.name':
          return 'test.exe';
      }
    };
    expect(getCategoryTitle(getFieldsData, 'host')).toBe('Event details');
    expect(getCategoryTitle(getFieldsData, '')).toBe('Event details');
  });
});
