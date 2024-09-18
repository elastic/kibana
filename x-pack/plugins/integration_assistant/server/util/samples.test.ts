/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flattenObjectsList } from './samples';

describe('flattenObjectsList', () => {
  it('Should return a list with flattened key/value entries', async () => {
    const result = flattenObjectsList([
      {
        name: 'a',
        type: 'group',
        fields: [
          {
            name: 'b',
            type: 'keyword',
            description: 'Some description for b',
          },
          {
            name: 'c',
            type: 'group',
            fields: [
              {
                name: 'd',
                type: 'keyword',
              },
              {
                name: 'e',
                description: 'Some description for e',
                type: 'keyword',
              },
            ],
          },
        ],
      },
    ]);

    expect(result).toEqual([
      {
        name: 'a.b',
        type: 'keyword',
        description: 'Some description for b',
      },
      {
        name: 'a.c.d',
        type: 'keyword',
        description: undefined,
      },
      {
        name: 'a.c.e',
        type: 'keyword',
        description: 'Some description for e',
      },
    ]);
  });

  it('Should return an empty list if passed an empty list', async () => {
    const result = flattenObjectsList([]);

    expect(result).toEqual([]);
  });

  it('Should return a list with key/value entries', async () => {
    const result = flattenObjectsList([
      {
        name: 'a',
        type: 'keyword',
        description: 'Some description for a',
      },
    ]);

    expect(result).toEqual([
      {
        name: 'a',
        type: 'keyword',
        description: 'Some description for a',
      },
    ]);
  });

  it('Should return an sorted list of key/value entries', async () => {
    const result = flattenObjectsList([
      {
        name: 'c',
        type: 'group',
        fields: [
          {
            name: 'b',
            type: 'keyword',
            description: 'Some description for b',
          },
          {
            name: 'a',
            type: 'group',
            fields: [
              {
                name: 'e',
                type: 'keyword',
                description: 'Some description for e',
              },
              {
                name: 'd',
                type: 'keyword',
              },
            ],
          },
        ],
      },
    ]);

    expect(result).toEqual([
      {
        name: 'c.a.d',
        type: 'keyword',
        description: undefined,
      },
      {
        name: 'c.a.e',
        type: 'keyword',
        description: 'Some description for e',
      },
      {
        name: 'c.b',
        type: 'keyword',
        description: 'Some description for b',
      },
    ]);
  });

  it('Should not error if group type is not an array', async () => {
    const result = flattenObjectsList([
      {
        name: 'a',
        type: 'group',
        fields: [
          {
            name: 'b',
            type: 'keyword',
            description: 'Some description for b',
          },
          {
            name: 'c',
            type: 'group',
          },
        ],
      },
    ]);

    expect(result).toEqual([
      {
        name: 'a.b',
        type: 'keyword',
        description: 'Some description for b',
      },
      {
        name: 'a.c',
        type: 'group',
        description: undefined,
      },
    ]);
  });
});
