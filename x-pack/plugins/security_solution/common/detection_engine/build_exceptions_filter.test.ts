/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getEntryMatchMock,
  getEntryMatchExcludeMock,
} from '../../../lists/common/schemas/types/entry_match.mock';
import {
  getEntryMatchAnyMock,
  getEntryMatchAnyExcludeMock,
} from '../../../lists/common/schemas/types/entry_match_any.mock';
import {
  getEntryExistsMock,
  getEntryExistsExcludedMock,
} from '../../../lists/common/schemas/types/entry_exists.mock';
import {
  getEntryNestedMock,
  getEntryNestedExcludeMock,
  getEntryNestedMixedEntries,
} from '../../../lists/common/schemas/types/entry_nested.mock';
import {
  getExceptionListItemSchemaMock,
  getExceptionListItemSchemaXMock,
} from '../../../lists/common/schemas/response/exception_list_item_schema.mock';

import {
  buildExceptionItemFilter,
  buildExclusionClause,
  buildExistsClause,
  buildMatchAnyClause,
  buildMatchClause,
  buildNestedClause,
  createOrClauses,
  chunkExceptions,
  buildExceptionFilter,
  ExceptionItemSansLargeValueLists,
} from './build_exceptions_filter';
import { EntryMatchAny, ExceptionListItemSchema } from '../../common/shared_imports';
import { hasLargeValueList } from './utils';

const modifiedGetEntryMatchAnyMock = (): EntryMatchAny => ({
  ...getEntryMatchAnyMock(),
  operator: 'included',
  value: ['some "host" name', 'some other host name'],
});

const getExceptionListItemsWoValueLists = (num: number): ExceptionItemSansLargeValueLists[] => {
  const items = getExceptionListItemSchemaXMock(num);
  return items.filter(
    ({ entries }) => !hasLargeValueList(entries)
  ) as ExceptionItemSansLargeValueLists[];
};

describe('build_exceptions_filter', () => {
  describe('buildExceptionFilter', () => {
    test('it should return undefined if no exception items', () => {
      const booleanFilter = buildExceptionFilter({
        lists: [],
        excludeExceptions: false,
        chunkSize: 1,
      });
      expect(booleanFilter).toBeUndefined();
    });

    test('it should build a filter given an exception list', () => {
      const booleanFilter = buildExceptionFilter({
        lists: [getExceptionListItemSchemaMock()],
        excludeExceptions: false,
        chunkSize: 1,
      });

      expect(booleanFilter).toEqual({
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
        lists: [exceptionItem1, exceptionItem2],
        excludeExceptions: true,
        chunkSize: 2,
      });
      expect(exceptionFilter).toEqual({
        meta: {
          alias: null,
          negate: true,
          disabled: false,
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
        lists: [exceptionItem1, exceptionItem2, exceptionItem3],
        excludeExceptions: true,
        chunkSize: 2,
      });

      expect(exceptionFilter).toEqual({
        meta: {
          alias: null,
          negate: true,
          disabled: false,
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
        lists: exceptions,
        excludeExceptions: true,
        chunkSize: 1,
      });

      expect(booleanFilter).toEqual({
        meta: { alias: null, negate: true, disabled: false },
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
                                  should: [
                                    {
                                      match_phrase: { 'parent.field.host.name': 'some host name' },
                                    },
                                  ],
                                  minimum_should_match: 1,
                                },
                              },
                              {
                                bool: {
                                  must_not: {
                                    bool: {
                                      should: [
                                        {
                                          bool: {
                                            should: [
                                              {
                                                match_phrase: {
                                                  'parent.field.host.name': 'some host name',
                                                },
                                              },
                                            ],
                                            minimum_should_match: 1,
                                          },
                                        },
                                        {
                                          bool: {
                                            should: [
                                              {
                                                match_phrase: {
                                                  'parent.field.host.name': 'some other host name',
                                                },
                                              },
                                            ],
                                            minimum_should_match: 1,
                                          },
                                        },
                                      ],
                                      minimum_should_match: 1,
                                    },
                                  },
                                },
                              },
                              {
                                bool: {
                                  should: [{ exists: { field: 'parent.field.host.name' } }],
                                  minimum_should_match: 1,
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
                        should: [
                          {
                            bool: {
                              should: [{ match_phrase: { 'host.name': 'some "host" name' } }],
                              minimum_should_match: 1,
                            },
                          },
                          {
                            bool: {
                              should: [{ match_phrase: { 'host.name': 'some other host name' } }],
                              minimum_should_match: 1,
                            },
                          },
                        ],
                        minimum_should_match: 1,
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
                                  should: [{ exists: { field: 'host.name' } }],
                                  minimum_should_match: 1,
                                },
                              },
                            },
                          },
                          {
                            bool: {
                              should: [{ match_phrase: { 'host.name': 'some host name' } }],
                              minimum_should_match: 1,
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

  describe('chunkExceptions', () => {
    test('it should NOT split a single should clause as there is nothing to split on with chunkSize 1', () => {
      const exceptions = getExceptionListItemsWoValueLists(1);
      const chunks = chunkExceptions(exceptions, 1);
      expect(chunks).toHaveLength(1);
    });

    test('it should NOT split a single should clause as there is nothing to split on with chunkSize 2', () => {
      const exceptions = getExceptionListItemsWoValueLists(1) as ExceptionItemSansLargeValueLists[];
      const chunks = chunkExceptions(exceptions, 2);
      expect(chunks).toHaveLength(1);
    });

    test('it should return an empty array if no exception items passed in', () => {
      const chunks = chunkExceptions([], 2);
      expect(chunks).toEqual([]);
    });

    test('it should split an array of size 2 into a length 2 array with chunks on "chunkSize: 1"', () => {
      const exceptions = getExceptionListItemsWoValueLists(2);
      const chunks = chunkExceptions(exceptions, 1);
      expect(chunks).toHaveLength(2);
    });

    test('it should split an array of size 2 into a length 4 array with chunks on "chunkSize: 1"', () => {
      const exceptions = getExceptionListItemsWoValueLists(4);
      const chunks = chunkExceptions(exceptions, 1);
      expect(chunks).toHaveLength(4);
    });

    test('it should split an array of size 4 into a length 2 array with chunks on "chunkSize: 2"', () => {
      const exceptions = getExceptionListItemsWoValueLists(4);
      const chunks = chunkExceptions(exceptions, 2);
      expect(chunks).toHaveLength(2);
    });

    test('it should NOT split an array of size 4 into any groups on "chunkSize: 5"', () => {
      const exceptions = getExceptionListItemsWoValueLists(4);
      const chunks = chunkExceptions(exceptions, 5);
      expect(chunks).toHaveLength(1);
    });

    test('it should split an array of size 4 into 2 groups on "chunkSize: 3"', () => {
      const exceptions = getExceptionListItemsWoValueLists(4);
      const chunks = chunkExceptions(exceptions, 3);
      expect(chunks).toHaveLength(2);
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
                            should: [
                              { match_phrase: { 'parent.field.host.name': 'some host name' } },
                            ],
                            minimum_should_match: 1,
                          },
                        },
                        {
                          bool: {
                            should: [
                              { match_phrase: { 'parent.field.host.name': 'some host name' } },
                            ],
                            minimum_should_match: 1,
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
                  should: [{ match_phrase: { 'host.name': 'some host name' } }],
                  minimum_should_match: 1,
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
                            should: [
                              { match_phrase: { 'parent.field.host.name': 'some host name' } },
                            ],
                            minimum_should_match: 1,
                          },
                        },
                        {
                          bool: {
                            must_not: {
                              bool: {
                                should: [
                                  {
                                    bool: {
                                      should: [
                                        {
                                          match_phrase: {
                                            'parent.field.host.name': 'some host name',
                                          },
                                        },
                                      ],
                                      minimum_should_match: 1,
                                    },
                                  },
                                  {
                                    bool: {
                                      should: [
                                        {
                                          match_phrase: {
                                            'parent.field.host.name': 'some other host name',
                                          },
                                        },
                                      ],
                                      minimum_should_match: 1,
                                    },
                                  },
                                ],
                                minimum_should_match: 1,
                              },
                            },
                          },
                        },
                        {
                          bool: {
                            should: [{ exists: { field: 'parent.field.host.name' } }],
                            minimum_should_match: 1,
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
                  should: [
                    {
                      bool: {
                        should: [{ match_phrase: { 'host.name': 'some "host" name' } }],
                        minimum_should_match: 1,
                      },
                    },
                    {
                      bool: {
                        should: [{ match_phrase: { 'host.name': 'some other host name' } }],
                        minimum_should_match: 1,
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
              {
                bool: {
                  must_not: {
                    bool: {
                      should: [{ match_phrase: { 'host.name': 'some host name' } }],
                      minimum_should_match: 1,
                    },
                  },
                },
              },
              {
                bool: {
                  must_not: {
                    bool: { should: [{ exists: { field: 'host.name' } }], minimum_should_match: 1 },
                  },
                },
              },
            ],
          },
        },
        {
          bool: {
            must_not: {
              bool: { should: [{ exists: { field: 'host.name' } }], minimum_should_match: 1 },
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

      expect(exceptionItemFilter).toEqual({
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
                          should: [
                            {
                              match_phrase: {
                                'parent.field.host.name': 'some host name',
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                      {
                        bool: {
                          must_not: {
                            bool: {
                              should: [
                                {
                                  bool: {
                                    should: [
                                      {
                                        match_phrase: {
                                          'parent.field.host.name': 'some host name',
                                        },
                                      },
                                    ],
                                    minimum_should_match: 1,
                                  },
                                },
                                {
                                  bool: {
                                    should: [
                                      {
                                        match_phrase: {
                                          'parent.field.host.name': 'some other host name',
                                        },
                                      },
                                    ],
                                    minimum_should_match: 1,
                                  },
                                },
                              ],
                              minimum_should_match: 1,
                            },
                          },
                        },
                      },
                      {
                        bool: {
                          should: [{ exists: { field: 'parent.field.host.name' } }],
                          minimum_should_match: 1,
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
                should: [
                  {
                    bool: {
                      should: [{ match_phrase: { 'host.name': 'some "host" name' } }],
                      minimum_should_match: 1,
                    },
                  },
                  {
                    bool: {
                      should: [{ match_phrase: { 'host.name': 'some other host name' } }],
                      minimum_should_match: 1,
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            {
              bool: {
                must_not: {
                  bool: {
                    should: [{ match_phrase: { 'host.name': 'some host name' } }],
                    minimum_should_match: 1,
                  },
                },
              },
            },
            {
              bool: {
                must_not: {
                  bool: { should: [{ exists: { field: 'host.name' } }], minimum_should_match: 1 },
                },
              },
            },
          ],
        },
      });
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
              should: [
                {
                  bool: {
                    should: [{ match_phrase: { 'host.name': 'some host name' } }],
                    minimum_should_match: 1,
                  },
                },
                {
                  bool: {
                    should: [{ match_phrase: { 'host.name': 'some other host name' } }],
                    minimum_should_match: 1,
                  },
                },
              ],
              minimum_should_match: 1,
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
                    should: [{ match_phrase: { 'parent.field.host.name': 'some host name' } }],
                    minimum_should_match: 1,
                  },
                },
                {
                  bool: {
                    should: [{ match_phrase: { 'parent.field.host.name': 'some host name' } }],
                    minimum_should_match: 1,
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
                        should: [{ match_phrase: { 'parent.field.host.name': 'some host name' } }],
                        minimum_should_match: 1,
                      },
                    },
                  },
                },
                {
                  bool: {
                    must_not: {
                      bool: {
                        should: [
                          {
                            bool: {
                              should: [
                                { match_phrase: { 'parent.field.host.name': 'some host name' } },
                              ],
                              minimum_should_match: 1,
                            },
                          },
                          {
                            bool: {
                              should: [
                                {
                                  match_phrase: {
                                    'parent.field.host.name': 'some other host name',
                                  },
                                },
                              ],
                              minimum_should_match: 1,
                            },
                          },
                        ],
                        minimum_should_match: 1,
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
                    should: [{ match_phrase: { 'parent.field.host.name': 'some host name' } }],
                    minimum_should_match: 1,
                  },
                },
                {
                  bool: {
                    must_not: {
                      bool: {
                        should: [
                          {
                            bool: {
                              should: [
                                { match_phrase: { 'parent.field.host.name': 'some host name' } },
                              ],
                              minimum_should_match: 1,
                            },
                          },
                          {
                            bool: {
                              should: [
                                {
                                  match_phrase: {
                                    'parent.field.host.name': 'some other host name',
                                  },
                                },
                              ],
                              minimum_should_match: 1,
                            },
                          },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                  },
                },
                {
                  bool: {
                    should: [{ exists: { field: 'parent.field.host.name' } }],
                    minimum_should_match: 1,
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
