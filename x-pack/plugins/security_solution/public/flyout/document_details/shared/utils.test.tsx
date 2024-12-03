/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getField, getFieldArray, getEventTitle, getAlertTitle } from './utils';

describe('test getField', () => {
  it('should return the string value if field is a string', () => {
    expect(getField('test string')).toBe('test string');
  });
  it('should return the first string value if field is a string array', () => {
    expect(getField(['string1', 'string2', 'string3'])).toBe('string1');
  });

  it('should return null if field is not string or string array', () => {
    expect(getField(100)).toBe(null);
    expect(getField([1, 2, 3])).toBe(null);
    expect(getField({ test: 'test string' })).toBe(null);
    expect(getField(null)).toBe(null);
  });

  it('should return fallback value if field is not string or string array and emptyValue is provided', () => {
    expect(getField(100, '-')).toBe('-');
    expect(getField([1, 2, 3], '-')).toBe('-');
    expect(getField({ test: 'test string' }, '-')).toBe('-');
    expect(getField(null, '-')).toBe('-');
  });
});

describe('test getFieldArray', () => {
  it('should return the string value in an array if field is a string', () => {
    expect(getFieldArray('test string')).toStrictEqual(['test string']);
  });
  it('should return field array', () => {
    expect(getFieldArray(['string1', 'string2', 'string3'])).toStrictEqual([
      'string1',
      'string2',
      'string3',
    ]);
    expect(getFieldArray([1, 2, 3])).toStrictEqual([1, 2, 3]);
  });

  it('should return empty array if field is null or empty', () => {
    expect(getFieldArray(undefined)).toStrictEqual([]);
    expect(getFieldArray(null)).toStrictEqual([]);
  });
});

describe('test getEventTitle', () => {
  it('when event kind is event, return event title based on category', () => {
    expect(
      getEventTitle({
        eventKind: 'event',
        eventCategory: 'process',
        getFieldsData: (field) => (field === 'process.name' ? 'process name' : ''),
      })
    ).toBe('process name');
  });

  it('when event kind is alert, return External alert details', () => {
    expect(
      getEventTitle({ eventKind: 'alert', eventCategory: null, getFieldsData: jest.fn() })
    ).toBe('External alert details');
  });

  it('when event kind is not event or alert, return Event kind details', () => {
    expect(
      getEventTitle({ eventKind: 'metric', eventCategory: null, getFieldsData: jest.fn() })
    ).toBe('Metric details');
  });

  it('when event kind is null, return Event details', () => {
    expect(getEventTitle({ eventKind: null, eventCategory: null, getFieldsData: jest.fn() })).toBe(
      'Event details'
    );
  });
});

describe('test getAlertTitle', () => {
  it('when ruleName is undefined, return Document details', () => {
    expect(getAlertTitle({ ruleName: undefined })).toBe('Document details');
  });

  it('when ruleName is defined, return ruleName', () => {
    expect(getAlertTitle({ ruleName: 'test rule' })).toBe('test rule');
  });
});
