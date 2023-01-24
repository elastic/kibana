/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v1 as uuidv1 } from 'uuid';

import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { toElasticsearchQuery } from '@kbn/es-query';

import { CaseStatuses } from '../../common';
import { CaseSeverity } from '../../common/api';
import { ESCaseSeverity, ESCaseStatus } from '../services/cases/types';
import { createSavedObjectsSerializerMock } from './mocks';
import {
  arraysDifference,
  buildNestedFilter,
  buildRangeFilter,
  constructQueryOptions,
  constructSearch,
  convertSortField,
} from './utils';

describe('utils', () => {
  describe('convertSortField', () => {
    it('transforms status correctly', () => {
      expect(convertSortField('status')).toBe('status');
    });

    it('transforms createdAt correctly', () => {
      expect(convertSortField('createdAt')).toBe('created_at');
    });

    it('transforms created_at correctly', () => {
      expect(convertSortField('created_at')).toBe('created_at');
    });

    it('transforms updated_at correctly', () => {
      expect(convertSortField('updated_at')).toBe('updated_at');
    });

    it('transforms updatedAt correctly', () => {
      expect(convertSortField('updatedAt')).toBe('updated_at');
    });

    it('transforms closedAt correctly', () => {
      expect(convertSortField('closedAt')).toBe('closed_at');
    });

    it('transforms closed_at correctly', () => {
      expect(convertSortField('closed_at')).toBe('closed_at');
    });

    it('transforms title correctly', () => {
      expect(convertSortField('title')).toBe('title.keyword');
    });

    it('transforms default correctly', () => {
      expect(convertSortField('not-exist')).toBe('created_at');
    });
  });

  describe('buildRangeFilter', () => {
    it('returns undefined if both the from and or are undefined', () => {
      const node = buildRangeFilter({});
      expect(node).toBeFalsy();
    });

    it('returns undefined if both the from and or are null', () => {
      // @ts-expect-error
      const node = buildRangeFilter({ from: null, to: null });
      expect(node).toBeFalsy();
    });

    it('creates a range filter with only the from correctly', () => {
      const node = buildRangeFilter({ from: 'now-1M' });
      expect(toElasticsearchQuery(node!)).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "minimum_should_match": 1,
            "should": Array [
              Object {
                "range": Object {
                  "cases.attributes.created_at": Object {
                    "gte": "now-1M",
                  },
                },
              },
            ],
          },
        }
      `);
    });

    it('creates a range filter with only the to correctly', () => {
      const node = buildRangeFilter({ to: 'now' });
      expect(toElasticsearchQuery(node!)).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "minimum_should_match": 1,
            "should": Array [
              Object {
                "range": Object {
                  "cases.attributes.created_at": Object {
                    "lte": "now",
                  },
                },
              },
            ],
          },
        }
      `);
    });

    it('creates a range filter correctly', () => {
      const node = buildRangeFilter({ from: 'now-1M', to: 'now' });
      expect(toElasticsearchQuery(node!)).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "filter": Array [
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "range": Object {
                        "cases.attributes.created_at": Object {
                          "gte": "now-1M",
                        },
                      },
                    },
                  ],
                },
              },
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "range": Object {
                        "cases.attributes.created_at": Object {
                          "lte": "now",
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        }
      `);
    });

    it('creates a range filter with different field and saved object type provided', () => {
      const node = buildRangeFilter({
        from: 'now-1M',
        to: 'now',
        field: 'test',
        savedObjectType: 'test-type',
      });

      expect(toElasticsearchQuery(node!)).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "filter": Array [
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "range": Object {
                        "test-type.attributes.test": Object {
                          "gte": "now-1M",
                        },
                      },
                    },
                  ],
                },
              },
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "range": Object {
                        "test-type.attributes.test": Object {
                          "lte": "now",
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        }
      `);
    });

    it('escapes the query correctly', () => {
      const node = buildRangeFilter({
        from: '2022-04-27T12:55:47.576Z',
        to: '2022-04-27T12:56:47.576Z',
        field: '<weird field)',
        savedObjectType: '.weird SO)',
      });

      expect(toElasticsearchQuery(node!)).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "filter": Array [
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "range": Object {
                        ".weird SO).attributes.<weird field)": Object {
                          "gte": "2022-04-27T12:55:47.576Z",
                        },
                      },
                    },
                  ],
                },
              },
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "range": Object {
                        ".weird SO).attributes.<weird field)": Object {
                          "lte": "2022-04-27T12:56:47.576Z",
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        }
      `);
    });
  });

  describe('constructQueryOptions', () => {
    it('creates a filter with the tags', () => {
      const { filter } = constructQueryOptions({ tags: ['tag1', 'tag2'] });
      expect(filter).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "cases.attributes.tags",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "tag1",
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
                  "value": "cases.attributes.tags",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "tag2",
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

    it('creates a filter with the reporters', () => {
      expect(constructQueryOptions({ reporters: ['bob', 'sam'] }).filter).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "arguments": Array [
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "cases.attributes.created_by.username",
                    },
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "bob",
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
                      "value": "cases.attributes.created_by.username",
                    },
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "sam",
                    },
                  ],
                  "function": "is",
                  "type": "function",
                },
              ],
              "function": "or",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "arguments": Array [
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "cases.attributes.created_by.profile_uid",
                    },
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "bob",
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
                      "value": "cases.attributes.created_by.profile_uid",
                    },
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "sam",
                    },
                  ],
                  "function": "is",
                  "type": "function",
                },
              ],
              "function": "or",
              "type": "function",
            },
          ],
          "function": "or",
          "type": "function",
        }
      `);
    });

    it('creates a filter with the owner', () => {
      expect(constructQueryOptions({ owner: 'observability' }).filter).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "cases.attributes.owner",
            },
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "observability",
            },
          ],
          "function": "is",
          "type": "function",
        }
      `);
    });

    it.each([
      [CaseStatuses.open, ESCaseStatus.OPEN],
      [CaseStatuses['in-progress'], ESCaseStatus.IN_PROGRESS],
      [CaseStatuses.closed, ESCaseStatus.CLOSED],
    ])('creates a filter for status "%s"', (status, expectedStatus) => {
      expect(constructQueryOptions({ status }).filter).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "cases.attributes.status",
            },
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "${expectedStatus}",
            },
          ],
          "function": "is",
          "type": "function",
        }
      `);
    });

    it.each([
      [CaseSeverity.LOW, ESCaseSeverity.LOW],
      [CaseSeverity.MEDIUM, ESCaseSeverity.MEDIUM],
      [CaseSeverity.HIGH, ESCaseSeverity.HIGH],
      [CaseSeverity.CRITICAL, ESCaseSeverity.CRITICAL],
    ])('creates a filter for severity "%s"', (severity, expectedSeverity) => {
      expect(constructQueryOptions({ severity }).filter).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "cases.attributes.severity",
            },
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "${expectedSeverity}",
            },
          ],
          "function": "is",
          "type": "function",
        }
        `);
    });

    it('creates a filter for the time range', () => {
      expect(constructQueryOptions({ from: 'now-1M', to: 'now' }).filter).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "cases.attributes.created_at",
                },
                "gte",
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "now-1M",
                },
              ],
              "function": "range",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "cases.attributes.created_at",
                },
                "lte",
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "now",
                },
              ],
              "function": "range",
              "type": "function",
            },
          ],
          "function": "and",
          "type": "function",
        }
      `);
    });

    it('sets filter to undefined when no options were passed', () => {
      expect(constructQueryOptions({}).filter).toBeUndefined();
    });

    it('creates a filter with tags and reporters', () => {
      expect(constructQueryOptions({ tags: ['tag1', 'tag2'], reporters: 'sam' }).filter)
        .toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "arguments": Array [
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "cases.attributes.tags",
                    },
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "tag1",
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
                      "value": "cases.attributes.tags",
                    },
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "tag2",
                    },
                  ],
                  "function": "is",
                  "type": "function",
                },
              ],
              "function": "or",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "arguments": Array [
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "cases.attributes.created_by.username",
                    },
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "sam",
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
                      "value": "cases.attributes.created_by.profile_uid",
                    },
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "sam",
                    },
                  ],
                  "function": "is",
                  "type": "function",
                },
              ],
              "function": "or",
              "type": "function",
            },
          ],
          "function": "and",
          "type": "function",
        }
      `);
    });
  });

  describe('buildNestedFilter', () => {
    it('returns undefined if filters is undefined', () => {
      expect(buildNestedFilter({ field: '', nestedField: '', operator: 'or' })).toBeUndefined();
    });

    it('returns undefined when the filters array is empty', () => {
      expect(
        buildNestedFilter({ filters: [], field: '', nestedField: '', operator: 'or' })
      ).toBeUndefined();
    });

    it('returns a KueryNode for a single filter', () => {
      expect(
        toElasticsearchQuery(
          buildNestedFilter({
            filters: ['hello'],
            field: 'uid',
            nestedField: 'nestedField',
            operator: 'or',
          })!
        )
      ).toMatchInlineSnapshot(`
        Object {
          "nested": Object {
            "path": "cases.attributes.nestedField",
            "query": Object {
              "bool": Object {
                "minimum_should_match": 1,
                "should": Array [
                  Object {
                    "match": Object {
                      "cases.attributes.nestedField.uid": "hello",
                    },
                  },
                ],
              },
            },
            "score_mode": "none",
          },
        }
      `);
    });

    it("returns a KueryNode for multiple filters or'd together", () => {
      expect(
        toElasticsearchQuery(
          buildNestedFilter({
            filters: ['uid1', 'uid2'],
            field: 'uid',
            nestedField: 'nestedField',
            operator: 'or',
          })!
        )
      ).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "minimum_should_match": 1,
            "should": Array [
              Object {
                "nested": Object {
                  "path": "cases.attributes.nestedField",
                  "query": Object {
                    "bool": Object {
                      "minimum_should_match": 1,
                      "should": Array [
                        Object {
                          "match": Object {
                            "cases.attributes.nestedField.uid": "uid1",
                          },
                        },
                      ],
                    },
                  },
                  "score_mode": "none",
                },
              },
              Object {
                "nested": Object {
                  "path": "cases.attributes.nestedField",
                  "query": Object {
                    "bool": Object {
                      "minimum_should_match": 1,
                      "should": Array [
                        Object {
                          "match": Object {
                            "cases.attributes.nestedField.uid": "uid2",
                          },
                        },
                      ],
                    },
                  },
                  "score_mode": "none",
                },
              },
            ],
          },
        }
      `);
    });

    it("returns a KueryNode for multiple filters and'ed together", () => {
      expect(
        toElasticsearchQuery(
          buildNestedFilter({
            filters: ['uid1', 'uid2'],
            field: 'uid',
            nestedField: 'nestedField',
            operator: 'and',
          })!
        )
      ).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "filter": Array [
              Object {
                "nested": Object {
                  "path": "cases.attributes.nestedField",
                  "query": Object {
                    "bool": Object {
                      "minimum_should_match": 1,
                      "should": Array [
                        Object {
                          "match": Object {
                            "cases.attributes.nestedField.uid": "uid1",
                          },
                        },
                      ],
                    },
                  },
                  "score_mode": "none",
                },
              },
              Object {
                "nested": Object {
                  "path": "cases.attributes.nestedField",
                  "query": Object {
                    "bool": Object {
                      "minimum_should_match": 1,
                      "should": Array [
                        Object {
                          "match": Object {
                            "cases.attributes.nestedField.uid": "uid2",
                          },
                        },
                      ],
                    },
                  },
                  "score_mode": "none",
                },
              },
            ],
          },
        }
      `);
    });
  });

  describe('arraysDifference', () => {
    it('returns null if originalValue is null', () => {
      expect(arraysDifference(null, [])).toBeNull();
    });

    it('returns null if originalValue is undefined', () => {
      expect(arraysDifference(undefined, [])).toBeNull();
    });

    it('returns null if originalValue is not an array', () => {
      // @ts-expect-error passing a string instead of an array
      expect(arraysDifference('a string', [])).toBeNull();
    });

    it('returns null if updatedValue is null', () => {
      expect(arraysDifference([], null)).toBeNull();
    });

    it('returns null if updatedValue is undefined', () => {
      expect(arraysDifference([], undefined)).toBeNull();
    });

    it('returns null if updatedValue is not an array', () => {
      expect(arraysDifference([], 'a string' as unknown as string[])).toBeNull();
    });

    it('returns null if the arrays are both empty', () => {
      expect(arraysDifference([], [])).toBeNull();
    });

    describe('object arrays', () => {
      it('returns null if the arrays are both equal with single string', () => {
        expect(arraysDifference([{ uid: 'a' }], [{ uid: 'a' }])).toBeNull();
      });

      it('returns null if the arrays are both equal with multiple strings', () => {
        expect(
          arraysDifference([{ uid: 'a' }, { uid: 'b' }], [{ uid: 'a' }, { uid: 'b' }])
        ).toBeNull();
      });

      it("returns 'b' in the added items when the updated value contains an added value", () => {
        expect(arraysDifference([{ uid: 'a' }], [{ uid: 'a' }, { uid: 'b' }]))
          .toMatchInlineSnapshot(`
          Object {
            "addedItems": Array [
              Object {
                "uid": "b",
              },
            ],
            "deletedItems": Array [],
          }
        `);
      });

      it("returns 'b' in the deleted items when the updated value removes an item", () => {
        expect(arraysDifference([{ uid: 'a' }, { uid: 'b' }], [{ uid: 'a' }]))
          .toMatchInlineSnapshot(`
          Object {
            "addedItems": Array [],
            "deletedItems": Array [
              Object {
                "uid": "b",
              },
            ],
          }
        `);
      });

      it("returns 'a' and 'b' in the added items when the updated value adds both", () => {
        expect(arraysDifference([], [{ uid: 'a' }, { uid: 'b' }])).toMatchInlineSnapshot(`
          Object {
            "addedItems": Array [
              Object {
                "uid": "a",
              },
              Object {
                "uid": "b",
              },
            ],
            "deletedItems": Array [],
          }
        `);
      });

      it("returns 'a' and 'b' in the deleted items when the updated value removes both", () => {
        expect(arraysDifference([{ uid: 'a' }, { uid: 'b' }], [])).toMatchInlineSnapshot(`
          Object {
            "addedItems": Array [],
            "deletedItems": Array [
              Object {
                "uid": "a",
              },
              Object {
                "uid": "b",
              },
            ],
          }
        `);
      });

      it('returns the added and deleted values if the type of objects are different', () => {
        expect(arraysDifference([{ uid: 'a' }], [{ uid: 'a', hi: '1' }])).toMatchInlineSnapshot(`
          Object {
            "addedItems": Array [
              Object {
                "hi": "1",
                "uid": "a",
              },
            ],
            "deletedItems": Array [
              Object {
                "uid": "a",
              },
            ],
          }
        `);
      });
    });

    describe('string arrays', () => {
      it('returns null if the arrays are both equal with single string', () => {
        expect(arraysDifference(['a'], ['a'])).toBeNull();
      });

      it('returns null if the arrays are both equal with multiple strings', () => {
        expect(arraysDifference(['a', 'b'], ['a', 'b'])).toBeNull();
      });

      it("returns 'b' in the added items when the updated value contains an added value", () => {
        expect(arraysDifference(['a'], ['a', 'b'])).toMatchInlineSnapshot(`
          Object {
            "addedItems": Array [
              "b",
            ],
            "deletedItems": Array [],
          }
        `);
      });

      it("returns 'b' in the deleted items when the updated value removes an item", () => {
        expect(arraysDifference(['a', 'b'], ['a'])).toMatchInlineSnapshot(`
          Object {
            "addedItems": Array [],
            "deletedItems": Array [
              "b",
            ],
          }
        `);
      });

      it("returns 'a' and 'b' in the added items when the updated value adds both", () => {
        expect(arraysDifference([], ['a', 'b'])).toMatchInlineSnapshot(`
          Object {
            "addedItems": Array [
              "a",
              "b",
            ],
            "deletedItems": Array [],
          }
        `);
      });

      it("returns 'a' and 'b' in the deleted items when the updated value removes both", () => {
        expect(arraysDifference(['a', 'b'], [])).toMatchInlineSnapshot(`
          Object {
            "addedItems": Array [],
            "deletedItems": Array [
              "a",
              "b",
            ],
          }
        `);
      });
    });
  });

  describe('constructSearchById', () => {
    const savedObjectsSerializer = createSavedObjectsSerializerMock();

    it('returns the rootSearchFields and search with correct values when given a uuidv1', () => {
      const uuid = uuidv1();

      expect(constructSearch(uuid, DEFAULT_NAMESPACE_STRING, savedObjectsSerializer))
        .toMatchInlineSnapshot(`
        Object {
          "rootSearchFields": Array [
            "_id",
          ],
          "search": "\\"${uuid}\\" \\"cases:${uuid}\\"",
        }
      `);
    });

    it('search value not changed and no rootSearchFields when search is non-uuidv1', () => {
      const search = 'foobar';
      const result = constructSearch(search, DEFAULT_NAMESPACE_STRING, savedObjectsSerializer);

      expect(result).not.toHaveProperty('rootSearchFields');
      expect(result).toEqual({ search });
    });

    it('returns undefined if search term undefined', () => {
      expect(constructSearch(undefined, DEFAULT_NAMESPACE_STRING, savedObjectsSerializer)).toEqual(
        undefined
      );
    });
  });
});
