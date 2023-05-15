/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergerBrowserField } from '.';

describe('mergerBrowserField', () => {
  test('Should merge promises of browserFields', () => {
    expect(
      mergerBrowserField([
        {
          base: {
            fields: {
              _id: {
                name: '_id',
                type: 'string',
                searchable: true,
                aggregatable: true,
                readFromDocValues: true,
                category: 'base',
              },
            },
          },
        },
        {
          base: {
            fields: {
              tags: {
                name: 'tags',
                type: 'string',
                searchable: true,
                aggregatable: true,
                readFromDocValues: true,
                category: 'base',
              },
            },
          },
        },
      ])
    ).toMatchInlineSnapshot(`
      Object {
        "base": Object {
          "fields": Object {
            "_id": Object {
              "aggregatable": true,
              "category": "base",
              "name": "_id",
              "readFromDocValues": true,
              "searchable": true,
              "type": "string",
            },
            "tags": Object {
              "aggregatable": true,
              "category": "base",
              "name": "tags",
              "readFromDocValues": true,
              "searchable": true,
              "type": "string",
            },
          },
        },
      }
    `);
  });
});
