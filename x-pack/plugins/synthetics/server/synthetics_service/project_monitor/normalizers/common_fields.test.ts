/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flattenAndFormatObject } from './common_fields';

describe('normalizeYamlConfig', () => {
  it('does not continue flattening when encountering an array', () => {
    const array = ['value1', 'value2'];
    const supportedKeys: string[] = [];
    const nestedObject = {
      a: {
        nested: {
          key: array,
        },
      },
    };
    expect(flattenAndFormatObject(nestedObject, '', supportedKeys)).toEqual({
      'a.nested.key': array,
    });
  });

  it('does not continue flattening when encountering a supported key', () => {
    const supportedKeys: string[] = ['a.supported.key'];
    const object = {
      with: {
        further: {
          nesting: '',
        },
      },
    };
    const nestedObject = {
      a: {
        supported: {
          key: object,
        },
      },
    };
    expect(flattenAndFormatObject(nestedObject, '', supportedKeys)).toEqual({
      'a.supported.key': object,
    });
  });

  it('flattens objects', () => {
    const supportedKeys: string[] = [];
    const nestedObject = {
      a: {
        nested: {
          key: 'value1',
        },
      },
      b: {
        nested: {
          key: 'value2',
        },
      },
    };
    expect(flattenAndFormatObject(nestedObject, '', supportedKeys)).toEqual({
      'a.nested.key': 'value1',
      'b.nested.key': 'value2',
    });
  });
});
