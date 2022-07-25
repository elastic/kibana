/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRangeFilter, constructQueryOptions, sortToSnake } from './utils';
import { toElasticsearchQuery } from '@kbn/es-query';
import { CaseStatuses } from '../../common';
import { CaseSeverity } from '../../common/api';

describe('utils', () => {
  describe('sortToSnake', () => {
    it('transforms status correctly', () => {
      expect(sortToSnake('status')).toBe('status');
    });

    it('transforms createdAt correctly', () => {
      expect(sortToSnake('createdAt')).toBe('created_at');
    });

    it('transforms created_at correctly', () => {
      expect(sortToSnake('created_at')).toBe('created_at');
    });

    it('transforms closedAt correctly', () => {
      expect(sortToSnake('closedAt')).toBe('closed_at');
    });

    it('transforms closed_at correctly', () => {
      expect(sortToSnake('closed_at')).toBe('closed_at');
    });

    it('transforms default correctly', () => {
      expect(sortToSnake('not-exist')).toBe('created_at');
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
                  "type": "literal",
                  "value": "cases.attributes.tags",
                },
                Object {
                  "type": "literal",
                  "value": "tag1",
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
                  "value": "cases.attributes.tags",
                },
                Object {
                  "type": "literal",
                  "value": "tag2",
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

    it('creates a filter with the reporters', () => {
      expect(constructQueryOptions({ reporters: ['bob', 'sam'] }).filter).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "type": "literal",
                  "value": "cases.attributes.created_by.username",
                },
                Object {
                  "type": "literal",
                  "value": "bob",
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
                  "value": "cases.attributes.created_by.username",
                },
                Object {
                  "type": "literal",
                  "value": "sam",
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

    it('creates a filter with the owner', () => {
      expect(constructQueryOptions({ owner: 'observability' }).filter).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "type": "literal",
              "value": "cases.attributes.owner",
            },
            Object {
              "type": "literal",
              "value": "observability",
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

    it('creates a filter for the status', () => {
      expect(constructQueryOptions({ status: CaseStatuses.open }).filter).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "type": "literal",
              "value": "cases.attributes.status",
            },
            Object {
              "type": "literal",
              "value": "open",
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

    it('creates a filter for the severity', () => {
      expect(constructQueryOptions({ severity: CaseSeverity.CRITICAL }).filter)
        .toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "type": "literal",
              "value": "cases.attributes.severity",
            },
            Object {
              "type": "literal",
              "value": "critical",
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

    it('creates a filter for the time range', () => {
      expect(constructQueryOptions({ from: 'now-1M', to: 'now' }).filter).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "type": "literal",
                  "value": "cases.attributes.created_at",
                },
                "gte",
                Object {
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
                  "type": "literal",
                  "value": "cases.attributes.created_at",
                },
                "lte",
                Object {
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
                      "type": "literal",
                      "value": "cases.attributes.tags",
                    },
                    Object {
                      "type": "literal",
                      "value": "tag1",
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
                      "value": "cases.attributes.tags",
                    },
                    Object {
                      "type": "literal",
                      "value": "tag2",
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
            },
            Object {
              "arguments": Array [
                Object {
                  "type": "literal",
                  "value": "cases.attributes.created_by.username",
                },
                Object {
                  "type": "literal",
                  "value": "sam",
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
});
