/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nodeBuilder } from '@kbn/es-query';
import { OWNER_FIELD } from '../../common/api';
import {
  combineFilterWithAuthorizationFilter,
  ensureFieldIsSafeForQuery,
  getOwnersFilter,
  includeFieldsRequiredForAuthentication,
} from './utils';

describe('utils', () => {
  describe('combineFilterWithAuthorizationFilter', () => {
    it('returns undefined if neither a filter or authorizationFilter are passed', () => {
      expect(combineFilterWithAuthorizationFilter()).toBeUndefined();
    });

    it('returns a single KueryNode when only a filter is passed in', () => {
      const node = nodeBuilder.is('a', 'hello');
      expect(combineFilterWithAuthorizationFilter(node)).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "type": "literal",
              "value": "a",
            },
            Object {
              "type": "literal",
              "value": "hello",
            },
            Object {
              "type": "literal",
              "value": false,
            },
          ],
          "function": "is",
          "type": "function",
        }
      `);
    });

    it('returns a single KueryNode when only an authorizationFilter is passed in', () => {
      const node = nodeBuilder.is('a', 'hello');
      expect(combineFilterWithAuthorizationFilter(undefined, node)).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "type": "literal",
              "value": "a",
            },
            Object {
              "type": "literal",
              "value": "hello",
            },
            Object {
              "type": "literal",
              "value": false,
            },
          ],
          "function": "is",
          "type": "function",
        }
      `);
    });

    it("returns a single KueryNode and'ing together the passed in parameters", () => {
      const node = nodeBuilder.is('a', 'hello');
      const node2 = nodeBuilder.is('b', 'hi');

      expect(combineFilterWithAuthorizationFilter(node, node2)).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "type": "literal",
                  "value": "a",
                },
                Object {
                  "type": "literal",
                  "value": "hello",
                },
                Object {
                  "type": "literal",
                  "value": false,
                },
              ],
              "function": "is",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "type": "literal",
                  "value": "b",
                },
                Object {
                  "type": "literal",
                  "value": "hi",
                },
                Object {
                  "type": "literal",
                  "value": false,
                },
              ],
              "function": "is",
              "type": "function",
            },
          ],
          "function": "and",
          "type": "function",
        }
      `);
    });

    it("returns a single KueryNode and'ing together the passed in parameters in opposite order", () => {
      const node = nodeBuilder.is('a', 'hello');
      const node2 = nodeBuilder.is('b', 'hi');

      expect(combineFilterWithAuthorizationFilter(node2, node)).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "type": "literal",
                  "value": "b",
                },
                Object {
                  "type": "literal",
                  "value": "hi",
                },
                Object {
                  "type": "literal",
                  "value": false,
                },
              ],
              "function": "is",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "type": "literal",
                  "value": "a",
                },
                Object {
                  "type": "literal",
                  "value": "hello",
                },
                Object {
                  "type": "literal",
                  "value": false,
                },
              ],
              "function": "is",
              "type": "function",
            },
          ],
          "function": "and",
          "type": "function",
        }
      `);
    });
  });

  describe('includeFieldsRequiredForAuthentication', () => {
    it('returns undefined when the fields parameter is not specified', () => {
      expect(includeFieldsRequiredForAuthentication()).toBeUndefined();
    });

    it('returns undefined when the fields parameter is an empty array', () => {
      expect(includeFieldsRequiredForAuthentication([])).toBeUndefined();
    });

    it('returns an array without duplicates and including the owner field', () => {
      expect(includeFieldsRequiredForAuthentication(['a', 'b', 'a'])).toStrictEqual([
        'a',
        'b',
        OWNER_FIELD,
      ]);
    });
  });

  describe('ensureFieldIsSafeForQuery', () => {
    it("throws an error if field contains character that aren't safe in a KQL query", () => {
      expect(() => ensureFieldIsSafeForQuery('id', 'cases-*')).toThrowError(
        `expected id not to include invalid character: *`
      );

      expect(() => ensureFieldIsSafeForQuery('id', '<=""')).toThrowError(
        `expected id not to include invalid character: <=`
      );

      expect(() => ensureFieldIsSafeForQuery('id', '>=""')).toThrowError(
        `expected id not to include invalid character: >=`
      );

      expect(() => ensureFieldIsSafeForQuery('id', '1 or caseid:123')).toThrowError(
        `expected id not to include whitespace and invalid character: :`
      );

      expect(() => ensureFieldIsSafeForQuery('id', ') or caseid:123')).toThrowError(
        `expected id not to include whitespace and invalid characters: ), :`
      );

      expect(() => ensureFieldIsSafeForQuery('id', 'some space')).toThrowError(
        `expected id not to include whitespace`
      );
    });

    it("doesn't throw an error if field is safe as part of a KQL query", () => {
      expect(() => ensureFieldIsSafeForQuery('id', '123-0456-678')).not.toThrow();
    });
  });

  describe('getOwnersFilter', () => {
    it('returns undefined when the owners parameter is an empty array', () => {
      expect(getOwnersFilter('a', [])).toBeUndefined();
    });

    it('constructs a KueryNode with only a single node', () => {
      expect(getOwnersFilter('a', ['hello'])).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "type": "literal",
              "value": "a.attributes.owner",
            },
            Object {
              "type": "literal",
              "value": "hello",
            },
            Object {
              "type": "literal",
              "value": false,
            },
          ],
          "function": "is",
          "type": "function",
        }
      `);
    });

    it("constructs a KueryNode or'ing together two filters", () => {
      expect(getOwnersFilter('a', ['hello', 'hi'])).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "type": "literal",
                  "value": "a.attributes.owner",
                },
                Object {
                  "type": "literal",
                  "value": "hello",
                },
                Object {
                  "type": "literal",
                  "value": false,
                },
              ],
              "function": "is",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "type": "literal",
                  "value": "a.attributes.owner",
                },
                Object {
                  "type": "literal",
                  "value": "hi",
                },
                Object {
                  "type": "literal",
                  "value": false,
                },
              ],
              "function": "is",
              "type": "function",
            },
          ],
          "function": "or",
          "type": "function",
        }
      `);
    });
  });
});
