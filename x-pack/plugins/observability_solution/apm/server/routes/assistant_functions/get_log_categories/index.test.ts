/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getShouldMatchOrNotExistFilter } from '.';

describe('getShouldMatchOrNotExistFilter', () => {
  describe('when all fields are provided', () => {
    const result = getShouldMatchOrNotExistFilter([
      {
        field: 'service.name',
        value: 'opbeans-node',
      },
      {
        field: 'container.id',
        value: 'my-first-container',
      },
      {
        field: 'host.name',
        value: 'my-only-host',
      },
    ]);

    it('returns 3 filters matching the given values', () => {
      expect(result).toHaveLength(3);

      expect(
        result.flatMap(({ bool }) =>
          bool.should[0].bool.filter?.map(({ term }) => term)
        )
      ).toEqual([
        { 'service.name': 'opbeans-node' },
        { 'container.id': 'my-first-container' },
        { 'host.name': 'my-only-host' },
      ]);
    });
  });

  describe('when no fields are provided', () => {
    const result = getShouldMatchOrNotExistFilter([
      {
        field: 'service.name',
        value: undefined,
      },
      {
        field: 'container.id',
        value: undefined,
      },
      {
        field: 'host.name',
        value: undefined,
      },
    ]);

    it('returns no filters', () => {
      expect(result).toEqual([]);
    });
  });

  describe('when only `container.id` is provided', () => {
    const result = getShouldMatchOrNotExistFilter([
      {
        field: 'service.name',
        value: undefined,
      },
      {
        field: 'container.id',
        value: 'my-container',
      },
      {
        field: 'host.name',
        value: undefined,
      },
    ]);

    it('returns one filter for container.id', () => {
      expect(result).toHaveLength(1);
      expect(result[0].bool.should).toMatchInlineSnapshot(`
        Array [
          Object {
            "bool": Object {
              "filter": Array [
                Object {
                  "term": Object {
                    "container.id": "my-container",
                  },
                },
              ],
            },
          },
          Object {
            "bool": Object {
              "must_not": Object {
                "bool": Object {
                  "filter": Array [
                    Object {
                      "exists": Object {
                        "field": "container.id",
                      },
                    },
                  ],
                },
              },
            },
          },
        ]
      `);
    });
  });
});
