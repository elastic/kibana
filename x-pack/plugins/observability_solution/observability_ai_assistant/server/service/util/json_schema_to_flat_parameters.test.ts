/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { jsonSchemaToFlatParameters } from './json_schema_to_flat_parameters';

describe('jsonSchemaToFlatParameters', () => {
  it('converts a simple object', () => {
    expect(
      jsonSchemaToFlatParameters({
        type: 'object',
        properties: {
          str: {
            type: 'string',
          },
          bool: {
            type: 'boolean',
          },
        },
      })
    ).toEqual([
      {
        name: 'str',
        type: 'string',
        required: false,
      },
      {
        name: 'bool',
        type: 'boolean',
        required: false,
      },
    ]);
  });

  it('handles descriptions', () => {
    expect(
      jsonSchemaToFlatParameters({
        type: 'object',
        properties: {
          str: {
            type: 'string',
            description: 'My string',
          },
        },
      })
    ).toEqual([
      {
        name: 'str',
        type: 'string',
        required: false,
        description: 'My string',
      },
    ]);
  });

  it('handles required properties', () => {
    expect(
      jsonSchemaToFlatParameters({
        type: 'object',
        properties: {
          str: {
            type: 'string',
          },
          bool: {
            type: 'boolean',
          },
        },
        required: ['str'],
      })
    ).toEqual([
      {
        name: 'str',
        type: 'string',
        required: true,
      },
      {
        name: 'bool',
        type: 'boolean',
        required: false,
      },
    ]);
  });

  it('handles objects', () => {
    expect(
      jsonSchemaToFlatParameters({
        type: 'object',
        properties: {
          nested: {
            type: 'object',
            properties: {
              str: {
                type: 'string',
              },
            },
          },
        },
        required: ['str'],
      })
    ).toEqual([
      {
        name: 'nested.str',
        required: false,
        type: 'string',
      },
    ]);
  });

  it('handles arrays', () => {
    expect(
      jsonSchemaToFlatParameters({
        type: 'object',
        properties: {
          arr: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
        required: ['str'],
      })
    ).toEqual([
      {
        name: 'arr',
        required: false,
        array: true,
        type: 'string',
      },
    ]);

    expect(
      jsonSchemaToFlatParameters({
        type: 'object',
        properties: {
          arr: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                foo: {
                  type: 'string',
                },
                bar: {
                  type: 'object',
                  properties: {
                    baz: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
        required: ['arr.foo.bar'],
      })
    ).toEqual([
      {
        name: 'arr.foo',
        required: false,
        array: true,
        type: 'string',
      },
      {
        name: 'arr.bar.baz',
        required: false,
        array: true,
        type: 'string',
      },
    ]);
  });

  it('handles enum and const', () => {
    expect(
      jsonSchemaToFlatParameters({
        type: 'object',
        properties: {
          constant: {
            type: 'string',
            const: 'foo',
          },
          enum: {
            type: 'number',
            enum: ['foo', 'bar'],
          },
        },
        required: ['str'],
      })
    ).toEqual([
      {
        name: 'constant',
        required: false,
        type: 'string',
        constant: 'foo',
      },
      {
        name: 'enum',
        required: false,
        type: 'number',
        enum: ['foo', 'bar'],
      },
    ]);
  });
});
