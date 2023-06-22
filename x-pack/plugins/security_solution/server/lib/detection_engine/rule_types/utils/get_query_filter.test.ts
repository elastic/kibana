/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getQueryFilter, getAllFilters } from './get_query_filter';
import type { Filter } from '@kbn/es-query';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { getListClientMock } from '@kbn/lists-plugin/server/services/lists/list_client.mock';
import { buildExceptionFilter } from '@kbn/lists-plugin/server/services/exception_lists';

describe('get_filter', () => {
  describe('getQueryFilter', () => {
    describe('kuery', () => {
      test('it should work with an empty filter as kuery', () => {
        const queryFilter = getQueryFilter({
          query: 'host.name: linux',
          language: 'kuery',
          filters: [],
          index: ['auditbeat-*'],
          exceptionFilter: undefined,
        });
        expect(queryFilter).toEqual({
          bool: {
            must: [],
            filter: [
              {
                bool: {
                  should: [
                    {
                      match: {
                        'host.name': 'linux',
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
            should: [],
            must_not: [],
          },
        });
      });

      test('it should work with a simple filter as a kuery', () => {
        const queryFilter = getQueryFilter({
          query: 'host.name: windows',
          language: 'kuery',
          filters: [
            {
              meta: {
                alias: 'custom label here',
                disabled: false,
                key: 'host.name',
                negate: false,
                params: {
                  query: 'siem-windows',
                },
                type: 'phrase',
              },
              query: {
                match_phrase: {
                  'host.name': 'siem-windows',
                },
              },
            },
          ],
          index: ['auditbeat-*'],
          exceptionFilter: undefined,
        });
        expect(queryFilter).toEqual({
          bool: {
            must: [],
            filter: [
              {
                bool: {
                  should: [
                    {
                      match: {
                        'host.name': 'windows',
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
              {
                match_phrase: {
                  'host.name': 'siem-windows',
                },
              },
            ],
            should: [],
            must_not: [],
          },
        });
      });

      test('it should ignore disabled filters as a kuery', () => {
        const queryFilter = getQueryFilter({
          query: 'host.name: windows',
          language: 'kuery',
          filters: [
            {
              meta: {
                alias: 'custom label here',
                disabled: false,
                key: 'host.name',
                negate: false,
                params: {
                  query: 'siem-windows',
                },
                type: 'phrase',
              },
              query: {
                match_phrase: {
                  'host.name': 'siem-windows',
                },
              },
            },
            {
              meta: {
                alias: 'custom label here',
                disabled: true,
                key: 'host.name',
                negate: false,
                params: {
                  query: 'siem-windows',
                },
                type: 'phrase',
              },
              query: {
                match_phrase: {
                  'host.name': 'siem-windows',
                },
              },
            },
          ],
          index: ['auditbeat-*'],
          exceptionFilter: undefined,
        });
        expect(queryFilter).toEqual({
          bool: {
            must: [],
            filter: [
              {
                bool: {
                  should: [
                    {
                      match: {
                        'host.name': 'windows',
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
              {
                match_phrase: {
                  'host.name': 'siem-windows',
                },
              },
            ],
            should: [],
            must_not: [],
          },
        });
      });

      test('it should work with a simple filter as a kuery without meta information', () => {
        const queryFilter = getQueryFilter({
          query: 'host.name: windows',
          language: 'kuery',
          filters: [
            {
              query: {
                match_phrase: {
                  'host.name': 'siem-windows',
                },
              },
            },
          ],
          index: ['auditbeat-*'],
          exceptionFilter: undefined,
        });
        expect(queryFilter).toEqual({
          bool: {
            must: [],
            filter: [
              {
                bool: {
                  should: [
                    {
                      match: {
                        'host.name': 'windows',
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
              {
                match_phrase: {
                  'host.name': 'siem-windows',
                },
              },
            ],
            should: [],
            must_not: [],
          },
        });
      });

      test('it should work with a simple filter as a kuery without meta information with an exists', () => {
        const query: Partial<Filter> = {
          query: {
            match_phrase: {
              'host.name': 'siem-windows',
            },
          },
        };

        const exists: Partial<Filter> = {
          query: {
            exists: {
              field: 'host.hostname',
            },
          },
        } as Partial<Filter>;

        const queryFilter = getQueryFilter({
          query: 'host.name: windows',
          language: 'kuery',
          filters: [query, exists],
          index: ['auditbeat-*'],
          exceptionFilter: undefined,
        });
        expect(queryFilter).toEqual({
          bool: {
            must: [],
            filter: [
              {
                bool: {
                  should: [
                    {
                      match: {
                        'host.name': 'windows',
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
              {
                match_phrase: {
                  'host.name': 'siem-windows',
                },
              },
              {
                exists: {
                  field: 'host.hostname',
                },
              },
            ],
            should: [],
            must_not: [],
          },
        });
      });

      test('it should work with a simple filter that is disabled as a kuery', () => {
        const queryFilter = getQueryFilter({
          query: 'host.name: windows',
          language: 'kuery',
          filters: [
            {
              meta: {
                alias: 'custom label here',
                disabled: true,
                key: 'host.name',
                negate: false,
                params: {
                  query: 'siem-windows',
                },
                type: 'phrase',
              },
              query: {
                match_phrase: {
                  'host.name': 'siem-windows',
                },
              },
            },
          ],
          index: ['auditbeat-*'],
          exceptionFilter: undefined,
        });
        expect(queryFilter).toEqual({
          bool: {
            must: [],
            filter: [
              {
                bool: {
                  should: [
                    {
                      match: {
                        'host.name': 'windows',
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
            should: [],
            must_not: [],
          },
        });
      });
    });

    describe('lucene', () => {
      test('it should work with an empty filter as lucene', () => {
        const queryFilter = getQueryFilter({
          query: 'host.name: linux',
          language: 'lucene',
          filters: [],
          index: ['auditbeat-*'],
          exceptionFilter: undefined,
        });
        expect(queryFilter).toEqual({
          bool: {
            must: [
              {
                query_string: {
                  query: 'host.name: linux',
                  analyze_wildcard: true,
                  time_zone: 'Zulu',
                },
              },
            ],
            filter: [],
            should: [],
            must_not: [],
          },
        });
      });

      test('it should work with a simple filter as a lucene', () => {
        const queryFilter = getQueryFilter({
          query: 'host.name: windows',
          language: 'lucene',
          filters: [
            {
              meta: {
                alias: 'custom label here',
                disabled: false,
                key: 'host.name',
                negate: false,
                params: {
                  query: 'siem-windows',
                },
                type: 'phrase',
              },
              query: {
                match_phrase: {
                  'host.name': 'siem-windows',
                },
              },
            },
          ],
          index: ['auditbeat-*'],
          exceptionFilter: undefined,
        });
        expect(queryFilter).toEqual({
          bool: {
            must: [
              {
                query_string: {
                  query: 'host.name: windows',
                  analyze_wildcard: true,
                  time_zone: 'Zulu',
                },
              },
            ],
            filter: [
              {
                match_phrase: {
                  'host.name': 'siem-windows',
                },
              },
            ],
            should: [],
            must_not: [],
          },
        });
      });

      test('it should ignore disabled lucene filters', () => {
        const queryFilter = getQueryFilter({
          query: 'host.name: windows',
          language: 'lucene',
          filters: [
            {
              meta: {
                alias: 'custom label here',
                disabled: false,
                key: 'host.name',
                negate: false,
                params: {
                  query: 'siem-windows',
                },
                type: 'phrase',
              },
              query: {
                match_phrase: {
                  'host.name': 'siem-windows',
                },
              },
            },
            {
              meta: {
                alias: 'custom label here',
                disabled: true,
                key: 'host.name',
                negate: false,
                params: {
                  query: 'siem-windows',
                },
                type: 'phrase',
              },
              query: {
                match_phrase: {
                  'host.name': 'siem-windows',
                },
              },
            },
          ],
          index: ['auditbeat-*'],
          exceptionFilter: undefined,
        });
        expect(queryFilter).toEqual({
          bool: {
            must: [
              {
                query_string: {
                  query: 'host.name: windows',
                  analyze_wildcard: true,
                  time_zone: 'Zulu',
                },
              },
            ],
            filter: [
              {
                match_phrase: {
                  'host.name': 'siem-windows',
                },
              },
            ],
            should: [],
            must_not: [],
          },
        });
      });

      test('it should work with a simple filter that is disabled as a lucene', () => {
        const queryFilter = getQueryFilter({
          query: 'host.name: windows',
          language: 'lucene',
          filters: [
            {
              meta: {
                alias: 'custom label here',
                disabled: true,
                key: 'host.name',
                negate: false,
                params: {
                  query: 'siem-windows',
                },
                type: 'phrase',
              },
              query: {
                match_phrase: {
                  'host.name': 'siem-windows',
                },
              },
            },
          ],
          index: ['auditbeat-*'],
          exceptionFilter: undefined,
        });
        expect(queryFilter).toEqual({
          bool: {
            must: [
              {
                query_string: {
                  query: 'host.name: windows',
                  analyze_wildcard: true,
                  time_zone: 'Zulu',
                },
              },
            ],
            filter: [],
            should: [],
            must_not: [],
          },
        });
      });

      test('it should work with a list', async () => {
        const { filter } = await buildExceptionFilter({
          startedAt: new Date(),
          listClient: getListClientMock(),
          lists: [getExceptionListItemSchemaMock()],
          alias: null,
          chunkSize: 1024,
          excludeExceptions: true,
        });
        const queryFilter = getQueryFilter({
          query: 'host.name: linux',
          language: 'kuery',
          filters: [],
          index: ['auditbeat-*'],
          exceptionFilter: filter,
        });
        expect(queryFilter).toMatchInlineSnapshot(`
          Object {
            "bool": Object {
              "filter": Array [
                Object {
                  "bool": Object {
                    "minimum_should_match": 1,
                    "should": Array [
                      Object {
                        "match": Object {
                          "host.name": "linux",
                        },
                      },
                    ],
                  },
                },
              ],
              "must": Array [],
              "must_not": Array [
                Object {
                  "bool": Object {
                    "should": Array [
                      Object {
                        "bool": Object {
                          "filter": Array [
                            Object {
                              "nested": Object {
                                "path": "some.parentField",
                                "query": Object {
                                  "bool": Object {
                                    "minimum_should_match": 1,
                                    "should": Array [
                                      Object {
                                        "match_phrase": Object {
                                          "some.parentField.nested.field": "some value",
                                        },
                                      },
                                    ],
                                  },
                                },
                                "score_mode": "none",
                              },
                            },
                            Object {
                              "bool": Object {
                                "minimum_should_match": 1,
                                "should": Array [
                                  Object {
                                    "match_phrase": Object {
                                      "some.not.nested.field": "some value",
                                    },
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
              "should": Array [],
            },
          }
        `);
      });
    });

    test('it should work with a list with multiple items', async () => {
      const { filter } = await buildExceptionFilter({
        startedAt: new Date(),
        listClient: getListClientMock(),
        lists: [getExceptionListItemSchemaMock(), getExceptionListItemSchemaMock()],
        alias: null,
        chunkSize: 1024,
        excludeExceptions: true,
      });
      const queryFilter = getQueryFilter({
        query: 'host.name: linux',
        language: 'kuery',
        filters: [],
        index: ['auditbeat-*'],
        exceptionFilter: filter,
      });
      expect(queryFilter).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "filter": Array [
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "match": Object {
                        "host.name": "linux",
                      },
                    },
                  ],
                },
              },
            ],
            "must": Array [],
            "must_not": Array [
              Object {
                "bool": Object {
                  "should": Array [
                    Object {
                      "bool": Object {
                        "filter": Array [
                          Object {
                            "nested": Object {
                              "path": "some.parentField",
                              "query": Object {
                                "bool": Object {
                                  "minimum_should_match": 1,
                                  "should": Array [
                                    Object {
                                      "match_phrase": Object {
                                        "some.parentField.nested.field": "some value",
                                      },
                                    },
                                  ],
                                },
                              },
                              "score_mode": "none",
                            },
                          },
                          Object {
                            "bool": Object {
                              "minimum_should_match": 1,
                              "should": Array [
                                Object {
                                  "match_phrase": Object {
                                    "some.not.nested.field": "some value",
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                    Object {
                      "bool": Object {
                        "filter": Array [
                          Object {
                            "nested": Object {
                              "path": "some.parentField",
                              "query": Object {
                                "bool": Object {
                                  "minimum_should_match": 1,
                                  "should": Array [
                                    Object {
                                      "match_phrase": Object {
                                        "some.parentField.nested.field": "some value",
                                      },
                                    },
                                  ],
                                },
                              },
                              "score_mode": "none",
                            },
                          },
                          Object {
                            "bool": Object {
                              "minimum_should_match": 1,
                              "should": Array [
                                Object {
                                  "match_phrase": Object {
                                    "some.not.nested.field": "some value",
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
            "should": Array [],
          },
        }
      `);
    });

    test('it should work with an exception list that includes a nested type', async () => {
      const { filter } = await buildExceptionFilter({
        startedAt: new Date(),
        listClient: getListClientMock(),
        lists: [getExceptionListItemSchemaMock()],
        alias: null,
        chunkSize: 1024,
        excludeExceptions: true,
      });
      const queryFilter = getQueryFilter({
        query: 'host.name: linux',
        language: 'kuery',
        filters: [],
        index: ['auditbeat-*'],
        exceptionFilter: filter,
      });

      expect(queryFilter).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "filter": Array [
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "match": Object {
                        "host.name": "linux",
                      },
                    },
                  ],
                },
              },
            ],
            "must": Array [],
            "must_not": Array [
              Object {
                "bool": Object {
                  "should": Array [
                    Object {
                      "bool": Object {
                        "filter": Array [
                          Object {
                            "nested": Object {
                              "path": "some.parentField",
                              "query": Object {
                                "bool": Object {
                                  "minimum_should_match": 1,
                                  "should": Array [
                                    Object {
                                      "match_phrase": Object {
                                        "some.parentField.nested.field": "some value",
                                      },
                                    },
                                  ],
                                },
                              },
                              "score_mode": "none",
                            },
                          },
                          Object {
                            "bool": Object {
                              "minimum_should_match": 1,
                              "should": Array [
                                Object {
                                  "match_phrase": Object {
                                    "some.not.nested.field": "some value",
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
            "should": Array [],
          },
        }
      `);
    });

    test('it should work when exceptionFilter has value undefined', () => {
      const queryFilter = getQueryFilter({
        query: 'host.name: linux',
        language: 'kuery',
        filters: [],
        index: ['auditbeat-*'],
        exceptionFilter: undefined,
      });
      expect(queryFilter).toEqual({
        bool: {
          filter: [
            { bool: { minimum_should_match: 1, should: [{ match: { 'host.name': 'linux' } }] } },
          ],
          must: [],
          must_not: [],
          should: [],
        },
      });
    });

    describe('when "excludeExceptions" is false', () => {
      test('it should work with a list', async () => {
        const { filter } = await buildExceptionFilter({
          startedAt: new Date(),
          listClient: getListClientMock(),
          lists: [getExceptionListItemSchemaMock()],
          alias: null,
          chunkSize: 1024,
          excludeExceptions: false,
        });
        const queryFilter = getQueryFilter({
          query: 'host.name: linux',
          language: 'kuery',
          filters: [],
          index: ['auditbeat-*'],
          exceptionFilter: filter,
        });
        expect(queryFilter).toMatchInlineSnapshot(`
          Object {
            "bool": Object {
              "filter": Array [
                Object {
                  "bool": Object {
                    "minimum_should_match": 1,
                    "should": Array [
                      Object {
                        "match": Object {
                          "host.name": "linux",
                        },
                      },
                    ],
                  },
                },
                Object {
                  "bool": Object {
                    "should": Array [
                      Object {
                        "bool": Object {
                          "filter": Array [
                            Object {
                              "nested": Object {
                                "path": "some.parentField",
                                "query": Object {
                                  "bool": Object {
                                    "minimum_should_match": 1,
                                    "should": Array [
                                      Object {
                                        "match_phrase": Object {
                                          "some.parentField.nested.field": "some value",
                                        },
                                      },
                                    ],
                                  },
                                },
                                "score_mode": "none",
                              },
                            },
                            Object {
                              "bool": Object {
                                "minimum_should_match": 1,
                                "should": Array [
                                  Object {
                                    "match_phrase": Object {
                                      "some.not.nested.field": "some value",
                                    },
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
              "must": Array [],
              "must_not": Array [],
              "should": Array [],
            },
          }
        `);
      });

      test('it should work with a list with multiple items', async () => {
        const { filter } = await buildExceptionFilter({
          startedAt: new Date(),
          listClient: getListClientMock(),
          lists: [getExceptionListItemSchemaMock(), getExceptionListItemSchemaMock()],
          alias: null,
          chunkSize: 1024,
          excludeExceptions: false,
        });
        const queryFilter = getQueryFilter({
          query: 'host.name: linux',
          language: 'kuery',
          filters: [],
          index: ['auditbeat-*'],
          exceptionFilter: filter,
        });
        expect(queryFilter).toMatchInlineSnapshot(`
          Object {
            "bool": Object {
              "filter": Array [
                Object {
                  "bool": Object {
                    "minimum_should_match": 1,
                    "should": Array [
                      Object {
                        "match": Object {
                          "host.name": "linux",
                        },
                      },
                    ],
                  },
                },
                Object {
                  "bool": Object {
                    "should": Array [
                      Object {
                        "bool": Object {
                          "filter": Array [
                            Object {
                              "nested": Object {
                                "path": "some.parentField",
                                "query": Object {
                                  "bool": Object {
                                    "minimum_should_match": 1,
                                    "should": Array [
                                      Object {
                                        "match_phrase": Object {
                                          "some.parentField.nested.field": "some value",
                                        },
                                      },
                                    ],
                                  },
                                },
                                "score_mode": "none",
                              },
                            },
                            Object {
                              "bool": Object {
                                "minimum_should_match": 1,
                                "should": Array [
                                  Object {
                                    "match_phrase": Object {
                                      "some.not.nested.field": "some value",
                                    },
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
                      Object {
                        "bool": Object {
                          "filter": Array [
                            Object {
                              "nested": Object {
                                "path": "some.parentField",
                                "query": Object {
                                  "bool": Object {
                                    "minimum_should_match": 1,
                                    "should": Array [
                                      Object {
                                        "match_phrase": Object {
                                          "some.parentField.nested.field": "some value",
                                        },
                                      },
                                    ],
                                  },
                                },
                                "score_mode": "none",
                              },
                            },
                            Object {
                              "bool": Object {
                                "minimum_should_match": 1,
                                "should": Array [
                                  Object {
                                    "match_phrase": Object {
                                      "some.not.nested.field": "some value",
                                    },
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
              "must": Array [],
              "must_not": Array [],
              "should": Array [],
            },
          }
        `);
      });
    });

    test('it should work with a nested object queries', () => {
      const queryFilter = getQueryFilter({
        query: 'category:{ name:Frank and trusted:true }',
        language: 'kuery',
        filters: [],
        index: ['auditbeat-*'],
        exceptionFilter: undefined,
      });
      expect(queryFilter).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "filter": Array [
              Object {
                "nested": Object {
                  "path": "category",
                  "query": Object {
                    "bool": Object {
                      "filter": Array [
                        Object {
                          "bool": Object {
                            "minimum_should_match": 1,
                            "should": Array [
                              Object {
                                "match": Object {
                                  "category.name": "Frank",
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
                                "match": Object {
                                  "category.trusted": true,
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                  "score_mode": "none",
                },
              },
            ],
            "must": Array [],
            "must_not": Array [],
            "should": Array [],
          },
        }
      `);
    });

    test('it works with references and does not add indexes', () => {
      const queryFilter = getQueryFilter({
        query:
          '(event.module:suricata and event.kind:alert) and suricata.eve.alert.signature_id: (2610182 or 2610183 or 2610184 or 2610185 or 2610186 or 2610187)',
        language: 'kuery',
        filters: [],
        index: ['my custom index'],
        exceptionFilter: undefined,
      });
      expect(queryFilter).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "filter": Array [
              Object {
                "bool": Object {
                  "filter": Array [
                    Object {
                      "bool": Object {
                        "filter": Array [
                          Object {
                            "bool": Object {
                              "minimum_should_match": 1,
                              "should": Array [
                                Object {
                                  "match": Object {
                                    "event.module": "suricata",
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
                                  "match": Object {
                                    "event.kind": "alert",
                                  },
                                },
                              ],
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
                            "bool": Object {
                              "minimum_should_match": 1,
                              "should": Array [
                                Object {
                                  "match": Object {
                                    "suricata.eve.alert.signature_id": "2610182",
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
                                  "match": Object {
                                    "suricata.eve.alert.signature_id": "2610183",
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
                                  "match": Object {
                                    "suricata.eve.alert.signature_id": "2610184",
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
                                  "match": Object {
                                    "suricata.eve.alert.signature_id": "2610185",
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
                                  "match": Object {
                                    "suricata.eve.alert.signature_id": "2610186",
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
                                  "match": Object {
                                    "suricata.eve.alert.signature_id": "2610187",
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
            "must": Array [],
            "must_not": Array [],
            "should": Array [],
          },
        }
      `);
    });
  });

  describe('getAllFilters', () => {
    const exceptionsFilter = {
      meta: { alias: null, negate: false, disabled: false },
      query: {
        bool: {
          should: [
            {
              bool: {
                filter: [
                  {
                    nested: {
                      path: 'some.parentField',
                      query: {
                        bool: {
                          should: [
                            { match_phrase: { 'some.parentField.nested.field': 'some value' } },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                      score_mode: 'none',
                    },
                  },
                  {
                    bool: {
                      should: [{ match_phrase: { 'some.not.nested.field': 'some value' } }],
                      minimum_should_match: 1,
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    };
    const simpleFilter = {
      meta: {
        alias: 'custom label here',
        disabled: false,
        key: 'host.name',
        negate: false,
        params: {
          query: 'siem-windows',
        },
        type: 'phrase',
      },
      query: {
        match_phrase: {
          'host.name': 'siem-windows',
        },
      },
    };

    test('it returns array with exceptions filter if exceptions filter if no other filters passed in', () => {
      const filters = getAllFilters([], exceptionsFilter);

      expect(filters).toEqual([exceptionsFilter]);
    });

    test('it returns empty array if no filters', () => {
      const filters = getAllFilters([], undefined);

      expect(filters).toEqual([]);
    });

    test('it returns array with exceptions filter if exceptions filter is not undefined', () => {
      const filters = getAllFilters([simpleFilter], exceptionsFilter);

      expect(filters[0]).toEqual(simpleFilter);
      expect(filters[1]).toEqual(exceptionsFilter);
    });

    test('it returns array without exceptions filter if exceptions filter is undefined', () => {
      const filters = getAllFilters([simpleFilter], undefined);

      expect(filters[0]).toEqual(simpleFilter);
      expect(filters[1]).toBeUndefined();
    });
  });
});
