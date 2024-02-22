/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { convertDeserializedXmlWithJsonSchema } from './convert_deserialized_xml_with_json_schema';

describe('deserializeXmlWithJsonSchema', () => {
  it('deserializes XML into a JSON object according to the JSON schema', () => {
    expect(
      convertDeserializedXmlWithJsonSchema(
        [
          {
            foo: ['bar'],
          },
        ],
        {
          type: 'object',
          properties: {
            foo: {
              type: 'string',
            },
          },
        }
      )
    ).toEqual({ foo: 'bar' });
  });

  it('converts strings to numbers if needed', () => {
    expect(
      convertDeserializedXmlWithJsonSchema(
        [
          {
            myNumber: ['0'],
          },
        ],
        {
          type: 'object',
          properties: {
            myNumber: {
              type: 'number',
            },
          },
        }
      )
    ).toEqual({ myNumber: 0 });
  });

  it('de-dots object paths', () => {
    expect(
      convertDeserializedXmlWithJsonSchema(
        [
          {
            'myObject.foo': ['bar'],
          },
        ],
        {
          type: 'object',
          properties: {
            myObject: {
              type: 'object',
              properties: {
                foo: {
                  type: 'string',
                },
              },
            },
          },
        }
      )
    ).toEqual({
      myObject: {
        foo: 'bar',
      },
    });
  });

  it('casts to an array if needed', () => {
    expect(
      convertDeserializedXmlWithJsonSchema(
        [
          {
            myNumber: ['0'],
          },
        ],
        {
          type: 'object',
          properties: {
            myNumber: {
              type: 'number',
            },
          },
        }
      )
    ).toEqual({
      myNumber: 0,
    });

    expect(
      convertDeserializedXmlWithJsonSchema(
        [
          {
            'labels.myProp': ['myFirstValue, mySecondValue'],
          },
        ],
        {
          type: 'object',
          properties: {
            labels: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  myProp: {
                    type: 'string',
                  },
                },
              },
            },
          },
        }
      )
    ).toEqual({
      labels: [{ myProp: 'myFirstValue' }, { myProp: 'mySecondValue' }],
    });
  });
});
