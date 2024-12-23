/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nodeBuilder } from '@kbn/es-query';
import {
  buildConsumersFilter,
  buildFilter,
  buildRuleTypeIdsFilter,
  combineFilterWithAuthorizationFilter,
  combineFilters,
} from './filters';

describe('filters', () => {
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
              "isQuoted": false,
              "type": "literal",
              "value": "a",
            },
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "hello",
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
              "isQuoted": false,
              "type": "literal",
              "value": "a",
            },
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "hello",
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
                  "isQuoted": false,
                  "type": "literal",
                  "value": "a",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "hello",
                },
              ],
              "function": "is",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "b",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "hi",
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
                  "isQuoted": false,
                  "type": "literal",
                  "value": "b",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "hi",
                },
              ],
              "function": "is",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "a",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "hello",
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

  describe('buildFilter', () => {
    it('returns undefined if filters is undefined', () => {
      expect(buildFilter({ filters: undefined, field: 'abc', operator: 'or' })).toBeUndefined();
    });

    it('returns undefined if filters is is an empty array', () => {
      expect(buildFilter({ filters: [], field: 'abc', operator: 'or' })).toBeUndefined();
    });

    it('returns a KueryNode using or operator', () => {
      expect(buildFilter({ filters: ['value1'], field: 'abc', operator: 'or' }))
        .toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "alert.attributes.abc",
            },
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "value1",
            },
          ],
          "function": "is",
          "type": "function",
        }
      `);
    });

    it("returns multiple nodes or'd together", () => {
      expect(buildFilter({ filters: ['value1', 'value2'], field: 'abc', operator: 'or' }))
        .toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "alert.attributes.abc",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "value1",
                },
              ],
              "function": "is",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "alert.attributes.abc",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "value2",
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

    it('does not escape special kql characters in the filter values', () => {
      const specialCharacters = 'awesome:()\\<>"*';

      expect(buildFilter({ filters: [specialCharacters], field: 'abc', operator: 'or' }))
        .toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "alert.attributes.abc",
            },
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "awesome:()\\\\<>\\"*",
            },
          ],
          "function": "is",
          "type": "function",
        }
      `);
    });
  });

  describe('combineFilters', () => {
    it('returns undefined if the nodes are undefined or null', () => {
      expect(combineFilters([null, undefined])).toBeUndefined();
    });

    it('combines the filters correctly', () => {
      const node = nodeBuilder.is('a', 'hello');
      const node2 = nodeBuilder.is('b', 'hi');

      expect(combineFilters([node, null, undefined, node2])).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "a",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "hello",
                },
              ],
              "function": "is",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "b",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "hi",
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

    it('combines the filters correctly with an operator', () => {
      const node = nodeBuilder.is('a', 'hello');
      const node2 = nodeBuilder.is('b', 'hi');

      expect(combineFilters([node, null, undefined, node2], 'or')).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "a",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "hello",
                },
              ],
              "function": "is",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "b",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "hi",
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

  describe('buildRuleTypeIdsFilter', () => {
    it('returns undefined if ruleTypeIds is undefined', () => {
      expect(buildRuleTypeIdsFilter()).toBeUndefined();
    });

    it('returns undefined if ruleTypeIds is is an empty array', () => {
      expect(buildRuleTypeIdsFilter([])).toBeUndefined();
    });

    it('builds the filter correctly', () => {
      expect(buildRuleTypeIdsFilter(['foo', 'bar'])).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "alert.attributes.alertTypeId",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "foo",
                },
              ],
              "function": "is",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "alert.attributes.alertTypeId",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "bar",
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

  describe('buildConsumersFilter', () => {
    it('returns undefined if ruleTypeIds is undefined', () => {
      expect(buildConsumersFilter()).toBeUndefined();
    });

    it('returns undefined if ruleTypeIds is is an empty array', () => {
      expect(buildConsumersFilter([])).toBeUndefined();
    });

    it('builds the filter correctly', () => {
      expect(buildConsumersFilter(['foo', 'bar'])).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "alert.attributes.consumer",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "foo",
                },
              ],
              "function": "is",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "alert.attributes.consumer",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "bar",
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
