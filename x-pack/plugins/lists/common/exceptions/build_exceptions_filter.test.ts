/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EntryMatchAny,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  buildExceptionFilter,
  buildExceptionItemFilter,
  buildExclusionClause,
  buildExistsClause,
  buildMatchAnyClause,
  buildMatchClause,
  buildNestedClause,
  createOrClauses,
} from '@kbn/securitysolution-list-utils';

import { getEntryMatchExcludeMock, getEntryMatchMock } from '../schemas/types/entry_match.mock';
import {
  getEntryMatchAnyExcludeMock,
  getEntryMatchAnyMock,
} from '../schemas/types/entry_match_any.mock';
import { getEntryExistsExcludedMock, getEntryExistsMock } from '../schemas/types/entry_exists.mock';
import {
  getEntryNestedExcludeMock,
  getEntryNestedMixedEntries,
  getEntryNestedMock,
} from '../schemas/types/entry_nested.mock';
import { getExceptionListItemSchemaMock } from '../schemas/response/exception_list_item_schema.mock';

// TODO: Port the test over to packages/kbn-securitysolution-list-utils/src/build_exception_filter/index.test.ts once the mocks are ported to kbn

const modifiedGetEntryMatchAnyMock = (): EntryMatchAny => ({
  ...getEntryMatchAnyMock(),
  operator: 'included',
  value: ['some "host" name', 'some other host name'],
});

describe('build_exceptions_filter', () => {
  describe('buildExceptionFilter', () => {
    test('it should return undefined if no exception items', () => {
      const booleanFilter = buildExceptionFilter({
        alias: null,
        chunkSize: 1,
        excludeExceptions: false,
        lists: [],
      });
      expect(booleanFilter).toBeUndefined();
    });

    test('it should build a filter given an exception list', () => {
      const booleanFilter = buildExceptionFilter({
        alias: null,
        chunkSize: 1,
        excludeExceptions: false,
        lists: [getExceptionListItemSchemaMock()],
      });

      expect(booleanFilter).toEqual({
        meta: { alias: null, disabled: false, negate: false },
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
                            minimum_should_match: 1,
                            should: [
                              { match_phrase: { 'some.parentField.nested.field': 'some value' } },
                            ],
                          },
                        },
                        score_mode: 'none',
                      },
                    },
                    {
                      bool: {
                        minimum_should_match: 1,
                        should: [{ match_phrase: { 'some.not.nested.field': 'some value' } }],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      });
    });

    test('it should build a filter without chunking exception items', () => {
      const exceptionItem1: ExceptionListItemSchema = {
        ...getExceptionListItemSchemaMock(),
        entries: [
          { field: 'host.name', operator: 'included', type: 'match', value: 'linux' },
          { field: 'some.field', operator: 'included', type: 'match', value: 'value' },
        ],
      };
      const exceptionItem2: ExceptionListItemSchema = {
        ...getExceptionListItemSchemaMock(),
        entries: [{ field: 'user.name', operator: 'included', type: 'match', value: 'name' }],
      };
      const exceptionFilter = buildExceptionFilter({
        alias: null,
        chunkSize: 2,
        excludeExceptions: true,
        lists: [exceptionItem1, exceptionItem2],
      });
      expect(exceptionFilter).toEqual({
        meta: {
          alias: null,
          disabled: false,
          negate: true,
        },
        query: {
          bool: {
            should: [
              {
                bool: {
                  filter: [
                    {
                      bool: {
                        minimum_should_match: 1,
                        should: [
                          {
                            match_phrase: {
                              'host.name': 'linux',
                            },
                          },
                        ],
                      },
                    },
                    {
                      bool: {
                        minimum_should_match: 1,
                        should: [
                          {
                            match_phrase: {
                              'some.field': 'value',
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
              {
                bool: {
                  minimum_should_match: 1,
                  should: [
                    {
                      match_phrase: {
                        'user.name': 'name',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      });
    });

    test('it should properly chunk exception items', () => {
      const exceptionItem1: ExceptionListItemSchema = {
        ...getExceptionListItemSchemaMock(),
        entries: [
          { field: 'host.name', operator: 'included', type: 'match', value: 'linux' },
          { field: 'some.field', operator: 'included', type: 'match', value: 'value' },
        ],
      };
      const exceptionItem2: ExceptionListItemSchema = {
        ...getExceptionListItemSchemaMock(),
        entries: [{ field: 'user.name', operator: 'included', type: 'match', value: 'name' }],
      };
      const exceptionItem3: ExceptionListItemSchema = {
        ...getExceptionListItemSchemaMock(),
        entries: [{ field: 'file.path', operator: 'included', type: 'match', value: '/safe/path' }],
      };
      const exceptionFilter = buildExceptionFilter({
        alias: null,
        chunkSize: 2,
        excludeExceptions: true,
        lists: [exceptionItem1, exceptionItem2, exceptionItem3],
      });

      expect(exceptionFilter).toEqual({
        meta: {
          alias: null,
          disabled: false,
          negate: true,
        },
        query: {
          bool: {
            should: [
              {
                bool: {
                  should: [
                    {
                      bool: {
                        filter: [
                          {
                            bool: {
                              minimum_should_match: 1,
                              should: [
                                {
                                  match_phrase: {
                                    'host.name': 'linux',
                                  },
                                },
                              ],
                            },
                          },
                          {
                            bool: {
                              minimum_should_match: 1,
                              should: [
                                {
                                  match_phrase: {
                                    'some.field': 'value',
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                    {
                      bool: {
                        minimum_should_match: 1,
                        should: [
                          {
                            match_phrase: {
                              'user.name': 'name',
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
              {
                bool: {
                  should: [
                    {
                      bool: {
                        minimum_should_match: 1,
                        should: [
                          {
                            match_phrase: {
                              'file.path': '/safe/path',
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
      });
    });

    test('it should format all exception items and their entries as expected', () => {
      const exceptions = [
        { ...getExceptionListItemSchemaMock(), entries: [getEntryNestedMixedEntries()] },
        { ...getExceptionListItemSchemaMock(), entries: [modifiedGetEntryMatchAnyMock()] },
        {
          ...getExceptionListItemSchemaMock(),
          entries: [getEntryExistsExcludedMock(), getEntryMatchMock()],
        },
      ];

      const booleanFilter = buildExceptionFilter({
        alias: null,
        chunkSize: 1,
        excludeExceptions: true,
        lists: exceptions,
      });

      expect(booleanFilter).toEqual({
        meta: { alias: null, disabled: false, negate: true },
        query: {
          bool: {
            should: [
              {
                bool: {
                  should: [
                    {
                      nested: {
                        path: 'parent.field',
                        query: {
                          bool: {
                            filter: [
                              {
                                bool: {
                                  minimum_should_match: 1,
                                  should: [
                                    {
                                      match_phrase: { 'parent.field.host.name': 'some host name' },
                                    },
                                  ],
                                },
                              },
                              {
                                bool: {
                                  must_not: {
                                    bool: {
                                      minimum_should_match: 1,
                                      should: [
                                        {
                                          bool: {
                                            minimum_should_match: 1,
                                            should: [
                                              {
                                                match_phrase: {
                                                  'parent.field.host.name': 'some host name',
                                                },
                                              },
                                            ],
                                          },
                                        },
                                        {
                                          bool: {
                                            minimum_should_match: 1,
                                            should: [
                                              {
                                                match_phrase: {
                                                  'parent.field.host.name': 'some other host name',
                                                },
                                              },
                                            ],
                                          },
                                        },
                                      ],
                                    },
                                  },
                                },
                              },
                              {
                                bool: {
                                  minimum_should_match: 1,
                                  should: [{ exists: { field: 'parent.field.host.name' } }],
                                },
                              },
                            ],
                          },
                        },
                        score_mode: 'none',
                      },
                    },
                  ],
                },
              },
              {
                bool: {
                  should: [
                    {
                      bool: {
                        minimum_should_match: 1,
                        should: [
                          {
                            bool: {
                              minimum_should_match: 1,
                              should: [{ match_phrase: { 'host.name': 'some "host" name' } }],
                            },
                          },
                          {
                            bool: {
                              minimum_should_match: 1,
                              should: [{ match_phrase: { 'host.name': 'some other host name' } }],
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
              {
                bool: {
                  should: [
                    {
                      bool: {
                        filter: [
                          {
                            bool: {
                              must_not: {
                                bool: {
                                  minimum_should_match: 1,
                                  should: [{ exists: { field: 'host.name' } }],
                                },
                              },
                            },
                          },
                          {
                            bool: {
                              minimum_should_match: 1,
                              should: [{ match_phrase: { 'host.name': 'some host name' } }],
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
      });
    });
  });

  describe('createOrClauses', () => {
    test('it should create filter with one item if only one exception item exists', () => {
      const booleanFilter = createOrClauses([
        {
          ...getExceptionListItemSchemaMock(),
          entries: [getEntryNestedMock(), getEntryMatchMock()],
        },
        {
          ...getExceptionListItemSchemaMock(),
          entries: [
            getEntryNestedMixedEntries(),
            modifiedGetEntryMatchAnyMock(),
            getEntryMatchExcludeMock(),
            getEntryExistsExcludedMock(),
          ],
        },
        {
          ...getExceptionListItemSchemaMock(),
          entries: [getEntryExistsExcludedMock()],
        },
      ]);

      expect(booleanFilter).toEqual([
        {
          bool: {
            filter: [
              {
                nested: {
                  path: 'parent.field',
                  query: {
                    bool: {
                      filter: [
                        {
                          bool: {
                            minimum_should_match: 1,
                            should: [
                              { match_phrase: { 'parent.field.host.name': 'some host name' } },
                            ],
                          },
                        },
                        {
                          bool: {
                            minimum_should_match: 1,
                            should: [
                              { match_phrase: { 'parent.field.host.name': 'some host name' } },
                            ],
                          },
                        },
                      ],
                    },
                  },
                  score_mode: 'none',
                },
              },
              {
                bool: {
                  minimum_should_match: 1,
                  should: [{ match_phrase: { 'host.name': 'some host name' } }],
                },
              },
            ],
          },
        },
        {
          bool: {
            filter: [
              {
                nested: {
                  path: 'parent.field',
                  query: {
                    bool: {
                      filter: [
                        {
                          bool: {
                            minimum_should_match: 1,
                            should: [
                              { match_phrase: { 'parent.field.host.name': 'some host name' } },
                            ],
                          },
                        },
                        {
                          bool: {
                            must_not: {
                              bool: {
                                minimum_should_match: 1,
                                should: [
                                  {
                                    bool: {
                                      minimum_should_match: 1,
                                      should: [
                                        {
                                          match_phrase: {
                                            'parent.field.host.name': 'some host name',
                                          },
                                        },
                                      ],
                                    },
                                  },
                                  {
                                    bool: {
                                      minimum_should_match: 1,
                                      should: [
                                        {
                                          match_phrase: {
                                            'parent.field.host.name': 'some other host name',
                                          },
                                        },
                                      ],
                                    },
                                  },
                                ],
                              },
                            },
                          },
                        },
                        {
                          bool: {
                            minimum_should_match: 1,
                            should: [{ exists: { field: 'parent.field.host.name' } }],
                          },
                        },
                      ],
                    },
                  },
                  score_mode: 'none',
                },
              },
              {
                bool: {
                  minimum_should_match: 1,
                  should: [
                    {
                      bool: {
                        minimum_should_match: 1,
                        should: [{ match_phrase: { 'host.name': 'some "host" name' } }],
                      },
                    },
                    {
                      bool: {
                        minimum_should_match: 1,
                        should: [{ match_phrase: { 'host.name': 'some other host name' } }],
                      },
                    },
                  ],
                },
              },
              {
                bool: {
                  must_not: {
                    bool: {
                      minimum_should_match: 1,
                      should: [{ match_phrase: { 'host.name': 'some host name' } }],
                    },
                  },
                },
              },
              {
                bool: {
                  must_not: {
                    bool: { minimum_should_match: 1, should: [{ exists: { field: 'host.name' } }] },
                  },
                },
              },
            ],
          },
        },
        {
          bool: {
            must_not: {
              bool: { minimum_should_match: 1, should: [{ exists: { field: 'host.name' } }] },
            },
          },
        },
      ]);
    });
  });

  describe('buildExceptionItemFilter', () => {
    test('it should build exception item boolean filter from entries', () => {
      const exceptionItemFilter = buildExceptionItemFilter({
        ...getExceptionListItemSchemaMock(),
        entries: [
          getEntryNestedMixedEntries(),
          modifiedGetEntryMatchAnyMock(),
          getEntryMatchExcludeMock(),
          getEntryExistsExcludedMock(),
        ],
      });
      expect(exceptionItemFilter).toEqual([
        {
          bool: {
            filter: [
              {
                nested: {
                  path: 'parent.field',
                  query: {
                    bool: {
                      filter: [
                        {
                          bool: {
                            minimum_should_match: 1,
                            should: [
                              {
                                match_phrase: {
                                  'parent.field.host.name': 'some host name',
                                },
                              },
                            ],
                          },
                        },
                        {
                          bool: {
                            must_not: {
                              bool: {
                                minimum_should_match: 1,
                                should: [
                                  {
                                    bool: {
                                      minimum_should_match: 1,
                                      should: [
                                        {
                                          match_phrase: {
                                            'parent.field.host.name': 'some host name',
                                          },
                                        },
                                      ],
                                    },
                                  },
                                  {
                                    bool: {
                                      minimum_should_match: 1,
                                      should: [
                                        {
                                          match_phrase: {
                                            'parent.field.host.name': 'some other host name',
                                          },
                                        },
                                      ],
                                    },
                                  },
                                ],
                              },
                            },
                          },
                        },
                        {
                          bool: {
                            minimum_should_match: 1,
                            should: [{ exists: { field: 'parent.field.host.name' } }],
                          },
                        },
                      ],
                    },
                  },
                  score_mode: 'none',
                },
              },
              {
                bool: {
                  minimum_should_match: 1,
                  should: [
                    {
                      bool: {
                        minimum_should_match: 1,
                        should: [{ match_phrase: { 'host.name': 'some "host" name' } }],
                      },
                    },
                    {
                      bool: {
                        minimum_should_match: 1,
                        should: [{ match_phrase: { 'host.name': 'some other host name' } }],
                      },
                    },
                  ],
                },
              },
              {
                bool: {
                  must_not: {
                    bool: {
                      minimum_should_match: 1,
                      should: [{ match_phrase: { 'host.name': 'some host name' } }],
                    },
                  },
                },
              },
              {
                bool: {
                  must_not: {
                    bool: { minimum_should_match: 1, should: [{ exists: { field: 'host.name' } }] },
                  },
                },
              },
            ],
          },
        },
      ]);
    });
  });

  describe('buildExclusionClause', () => {
    test('it should build exclusion boolean filter when entry is "match"', () => {
      const booleanFilter = buildMatchClause(getEntryMatchMock());
      const exclusionFilter = buildExclusionClause(booleanFilter);

      expect(exclusionFilter).toEqual({
        bool: {
          must_not: {
            bool: {
              minimum_should_match: 1,
              should: [{ match_phrase: { 'host.name': 'some host name' } }],
            },
          },
        },
      });
    });

    test('it should build exclusion boolean filter when entry is "match_any"', () => {
      const booleanFilter = buildMatchAnyClause(modifiedGetEntryMatchAnyMock());
      const exclusionFilter = buildExclusionClause(booleanFilter);

      expect(exclusionFilter).toEqual({
        bool: {
          must_not: {
            bool: {
              minimum_should_match: 1,
              should: [
                {
                  bool: {
                    minimum_should_match: 1,
                    should: [{ match_phrase: { 'host.name': 'some "host" name' } }],
                  },
                },
                {
                  bool: {
                    minimum_should_match: 1,
                    should: [{ match_phrase: { 'host.name': 'some other host name' } }],
                  },
                },
              ],
            },
          },
        },
      });
    });

    test('it should build exclusion boolean filter when entry is "exists"', () => {
      const booleanFilter = buildExistsClause(getEntryExistsMock());
      const exclusionFilter = buildExclusionClause(booleanFilter);

      expect(exclusionFilter).toEqual({
        bool: {
          must_not: {
            bool: { minimum_should_match: 1, should: [{ exists: { field: 'host.name' } }] },
          },
        },
      });
    });
  });

  describe('buildMatchClause', () => {
    test('it should build boolean filter when operator is "included"', () => {
      const booleanFilter = buildMatchClause(getEntryMatchMock());

      expect(booleanFilter).toEqual({
        bool: {
          minimum_should_match: 1,
          should: [{ match_phrase: { 'host.name': 'some host name' } }],
        },
      });
    });

    test('it should build boolean filter when operator is "excluded"', () => {
      const booleanFilter = buildMatchClause(getEntryMatchExcludeMock());

      expect(booleanFilter).toEqual({
        bool: {
          must_not: {
            bool: {
              minimum_should_match: 1,
              should: [{ match_phrase: { 'host.name': 'some host name' } }],
            },
          },
        },
      });
    });
  });

  describe('buildMatchAnyClause', () => {
    test('it should build boolean filter when operator is "included"', () => {
      const booleanFilter = buildMatchAnyClause(modifiedGetEntryMatchAnyMock());

      expect(booleanFilter).toEqual({
        bool: {
          minimum_should_match: 1,
          should: [
            {
              bool: {
                minimum_should_match: 1,
                should: [{ match_phrase: { 'host.name': 'some "host" name' } }],
              },
            },
            {
              bool: {
                minimum_should_match: 1,
                should: [{ match_phrase: { 'host.name': 'some other host name' } }],
              },
            },
          ],
        },
      });
    });

    test('it should build boolean filter when operator is "excluded"', () => {
      const booleanFilter = buildMatchAnyClause(getEntryMatchAnyExcludeMock());

      expect(booleanFilter).toEqual({
        bool: {
          must_not: {
            bool: {
              minimum_should_match: 1,
              should: [
                {
                  bool: {
                    minimum_should_match: 1,
                    should: [{ match_phrase: { 'host.name': 'some host name' } }],
                  },
                },
                {
                  bool: {
                    minimum_should_match: 1,
                    should: [{ match_phrase: { 'host.name': 'some other host name' } }],
                  },
                },
              ],
            },
          },
        },
      });
    });
  });

  describe('buildExistsClause', () => {
    test('it should build boolean filter when operator is "included"', () => {
      const booleanFilter = buildExistsClause(getEntryExistsMock());

      expect(booleanFilter).toEqual({
        bool: { minimum_should_match: 1, should: [{ exists: { field: 'host.name' } }] },
      });
    });

    test('it should build boolean filter when operator is "excluded"', () => {
      const booleanFilter = buildExistsClause(getEntryExistsExcludedMock());

      expect(booleanFilter).toEqual({
        bool: {
          must_not: {
            bool: { minimum_should_match: 1, should: [{ exists: { field: 'host.name' } }] },
          },
        },
      });
    });
  });

  describe('buildNestedClause', () => {
    test('it should build nested filter when operator is "included"', () => {
      const nestedFilter = buildNestedClause(getEntryNestedMock());

      expect(nestedFilter).toEqual({
        nested: {
          path: 'parent.field',
          query: {
            bool: {
              filter: [
                {
                  bool: {
                    minimum_should_match: 1,
                    should: [{ match_phrase: { 'parent.field.host.name': 'some host name' } }],
                  },
                },
                {
                  bool: {
                    minimum_should_match: 1,
                    should: [{ match_phrase: { 'parent.field.host.name': 'some host name' } }],
                  },
                },
              ],
            },
          },
          score_mode: 'none',
        },
      });
    });

    test('it should build nested filter when operator is "excluded"', () => {
      const nestedFilter = buildNestedClause(getEntryNestedExcludeMock());

      expect(nestedFilter).toEqual({
        nested: {
          path: 'parent.field',
          query: {
            bool: {
              filter: [
                {
                  bool: {
                    must_not: {
                      bool: {
                        minimum_should_match: 1,
                        should: [{ match_phrase: { 'parent.field.host.name': 'some host name' } }],
                      },
                    },
                  },
                },
                {
                  bool: {
                    must_not: {
                      bool: {
                        minimum_should_match: 1,
                        should: [
                          {
                            bool: {
                              minimum_should_match: 1,
                              should: [
                                { match_phrase: { 'parent.field.host.name': 'some host name' } },
                              ],
                            },
                          },
                          {
                            bool: {
                              minimum_should_match: 1,
                              should: [
                                {
                                  match_phrase: {
                                    'parent.field.host.name': 'some other host name',
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },
          score_mode: 'none',
        },
      });
    });

    test('it should build nested filter with mixed entry types', () => {
      const nestedFilter = buildNestedClause(getEntryNestedMixedEntries());

      expect(nestedFilter).toEqual({
        nested: {
          path: 'parent.field',
          query: {
            bool: {
              filter: [
                {
                  bool: {
                    minimum_should_match: 1,
                    should: [{ match_phrase: { 'parent.field.host.name': 'some host name' } }],
                  },
                },
                {
                  bool: {
                    must_not: {
                      bool: {
                        minimum_should_match: 1,
                        should: [
                          {
                            bool: {
                              minimum_should_match: 1,
                              should: [
                                { match_phrase: { 'parent.field.host.name': 'some host name' } },
                              ],
                            },
                          },
                          {
                            bool: {
                              minimum_should_match: 1,
                              should: [
                                {
                                  match_phrase: {
                                    'parent.field.host.name': 'some other host name',
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  },
                },
                {
                  bool: {
                    minimum_should_match: 1,
                    should: [{ exists: { field: 'parent.field.host.name' } }],
                  },
                },
              ],
            },
          },
          score_mode: 'none',
        },
      });
    });
  });
});
