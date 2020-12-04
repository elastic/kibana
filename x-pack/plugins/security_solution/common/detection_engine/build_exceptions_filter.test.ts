/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { buildEsQuery, EsQueryConfig, IIndexPattern } from 'src/plugins/data/common';

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
} from './build_exceptions_filter';
import { EntryMatchAny } from '../../common/shared_imports';

const modifiedGetEntryMatchAnyMock = (): EntryMatchAny => ({
  ...getEntryMatchAnyMock(),
  operator: 'included',
  value: ['some host name', 'some other host name'],
});

const mockIndexPattern: IIndexPattern = {
  fields: [],
  title: '.auditbeat',
};
const mockConfig: EsQueryConfig = {
  allowLeadingWildcards: true,
  queryStringOptions: { analyze_wildcard: true },
  ignoreFilterIfFieldNotInIndex: false,
  dateFormatTZ: 'Zulu',
};

describe('build_exceptions_filter', () => {
  describe('buildExceptionFilter', () => {
    test('it should return undefined if no exception items', () => {
      const booleanFilter = buildExceptionFilter({
        lists: [],
        excludeExceptions: false,
        chunkSize: 1,
        config: mockConfig,
        indexPattern: mockIndexPattern,
      });
      expect(booleanFilter).toBeUndefined();
    });

    /*
     * Some of the following tests are more sanity checks. We previously were
     * converting exceptions to KQL by using the `buildEsQuery` util from the
     * data plugin to create the ES DSL. Since this util is widely used by other
     * teams and likely kept more up to date, using this util in the tests could help
     * us keep an eye out on if anything changes in the syntax and we need to update
     * how we build our ES queries.
     */
    test('it should format all exception item and their entries as expected', () => {
      const exceptions = [
        { ...getExceptionListItemSchemaMock(), entries: [getEntryNestedMixedEntries()] },
        { ...getExceptionListItemSchemaMock(), entries: [modifiedGetEntryMatchAnyMock()] },
        {
          ...getExceptionListItemSchemaMock(),
          entries: [getEntryExistsExcludedMock(), getEntryMatchMock()],
        },
      ];
      const exceptionsAsKql = [
        {
          language: 'kuery',
          query:
            'parent.field:{ host.name:"some host name" and not host.name:("some host name" or "some other host name") and host.name:* }',
        },
        { language: 'kuery', query: 'host.name:("some host name" or "some other host name")' },
        { language: 'kuery', query: 'not host.name:* and host.name:"some host name"' },
      ];
      const expected = buildEsQuery(mockIndexPattern, exceptionsAsKql, [], mockConfig);
      const booleanFilter = buildExceptionFilter({
        lists: exceptions,
        excludeExceptions: true,
        chunkSize: 1,
        config: mockConfig,
        indexPattern: mockIndexPattern,
      });
      console.log('GOT', JSON.stringify(booleanFilter?.query.bool.should));
      console.log('EXPECTED', JSON.stringify(expected.bool.filter));
      expect(booleanFilter?.query.bool.should).toEqual(expected.bool.filter);
    });

    describe('match', () => {
      test('it should return boolean filter when multiple exception items include "match" entries', () => {
        const exceptions = [
          {
            ...getExceptionListItemSchemaMock(),
            entries: [getEntryMatchMock(), getEntryMatchExcludeMock()],
          },
          { ...getExceptionListItemSchemaMock(), entries: [getEntryMatchMock()] },
        ];
        const exceptionsAsKql = [
          {
            language: 'kuery',
            query: 'host.name:"some host name" and not host.name:"some host name"',
          },
          { language: 'kuery', query: 'host.name:"some host name"' },
        ];
        const expected = buildEsQuery(mockIndexPattern, exceptionsAsKql, [], mockConfig);

        const booleanFilter = buildExceptionFilter({
          lists: exceptions,
          excludeExceptions: true,
          chunkSize: 1,
          config: mockConfig,
          indexPattern: mockIndexPattern,
        });
        expect(booleanFilter?.query.bool.should).toEqual(expected.bool.filter);
      });

      test('it should return boolean filter when single exception item includes "match" entries', () => {
        const exceptions = [
          { ...getExceptionListItemSchemaMock(), entries: [getEntryMatchMock()] },
        ];
        const exceptionsAsKql = [{ language: 'kuery', query: 'host.name:"some host name"' }];
        const expected = buildEsQuery(mockIndexPattern, exceptionsAsKql, [], mockConfig);

        const booleanFilter = buildExceptionFilter({
          lists: exceptions,
          excludeExceptions: true,
          chunkSize: 1,
          config: mockConfig,
          indexPattern: mockIndexPattern,
        });

        expect(booleanFilter?.query.bool.should).toEqual(expected.bool.filter);
      });
    });

    describe('match_any', () => {
      test('it should return boolean filter when multiple exception items include "match_any" entries', () => {
        const exceptions = [
          {
            ...getExceptionListItemSchemaMock(),
            entries: [modifiedGetEntryMatchAnyMock(), getEntryMatchAnyExcludeMock()],
          },
          { ...getExceptionListItemSchemaMock(), entries: [modifiedGetEntryMatchAnyMock()] },
        ];
        const exceptionsAsKql = [
          {
            language: 'kuery',
            query:
              'host.name:("some host name" or "some other host name") and not host.name:("some host name" or "some other host name")',
          },
          { language: 'kuery', query: 'host.name:("some host name" or "some other host name")' },
        ];
        const expected = buildEsQuery(mockIndexPattern, exceptionsAsKql, [], mockConfig);

        const booleanFilter = buildExceptionFilter({
          lists: exceptions,
          excludeExceptions: true,
          chunkSize: 1,
          config: mockConfig,
          indexPattern: mockIndexPattern,
        });
        expect(booleanFilter?.query.bool.should).toEqual(expected.bool.filter);
      });

      test('it should return boolean filter when single exception item includes "match_any" entries', () => {
        const exceptions = [
          { ...getExceptionListItemSchemaMock(), entries: [modifiedGetEntryMatchAnyMock()] },
        ];
        const exceptionsAsKql = [
          { language: 'kuery', query: 'host.name:("some host name" or "some other host name")' },
        ];
        const expected = buildEsQuery(mockIndexPattern, exceptionsAsKql, [], mockConfig);

        const booleanFilter = buildExceptionFilter({
          lists: exceptions,
          excludeExceptions: true,
          chunkSize: 1,
          config: mockConfig,
          indexPattern: mockIndexPattern,
        });
        expect(booleanFilter?.query.bool.should).toEqual(expected.bool.filter);
      });
    });

    describe('exists', () => {
      test('it should return boolean filter when multiple exception items include "exists" entries', () => {
        const exceptions = [
          {
            ...getExceptionListItemSchemaMock(),
            entries: [getEntryExistsMock(), getEntryExistsExcludedMock()],
          },
          { ...getExceptionListItemSchemaMock(), entries: [getEntryExistsMock()] },
        ];
        const exceptionsAsKql = [
          { language: 'kuery', query: 'host.name:* and not host.name:*' },
          { language: 'kuery', query: 'host.name:*' },
        ];
        const expected = buildEsQuery(mockIndexPattern, exceptionsAsKql, [], mockConfig);

        const booleanFilter = buildExceptionFilter({
          lists: exceptions,
          excludeExceptions: true,
          chunkSize: 1,
          config: mockConfig,
          indexPattern: mockIndexPattern,
        });
        expect(booleanFilter?.query.bool.should).toEqual(expected.bool.filter);
      });

      test('it should return boolean filter when single exception item includes "exists" entries', () => {
        const exceptions = [
          { ...getExceptionListItemSchemaMock(), entries: [getEntryExistsMock()] },
        ];
        const exceptionsAsKql = [{ language: 'kuery', query: 'host.name:*' }];
        const expected = buildEsQuery(mockIndexPattern, exceptionsAsKql, [], mockConfig);

        const booleanFilter = buildExceptionFilter({
          lists: exceptions,
          excludeExceptions: true,
          chunkSize: 1,
          config: mockConfig,
          indexPattern: mockIndexPattern,
        });
        expect(booleanFilter?.query.bool.should).toEqual(expected.bool.filter);
      });
    });

    describe('nested', () => {
      test('it should return boolean filter when multiple exception items include "nested" entries', () => {
        const exceptions = [
          {
            ...getExceptionListItemSchemaMock(),
            entries: [getEntryNestedMock(), getEntryNestedExcludeMock()],
          },
          { ...getExceptionListItemSchemaMock(), entries: [getEntryNestedMock()] },
        ];
        const exceptionsAsKql = [
          {
            language: 'kuery',
            query:
              'parent.field:{ host.name:"some host name" and host.name:"some host name" } and parent.field:{ not host.name:"some host name" and not host.name:("some host name" or "some other host name") }',
          },
          {
            language: 'kuery',
            query: 'parent.field:{ host.name:"some host name" and host.name:"some host name" }',
          },
        ];
        const expected = buildEsQuery(mockIndexPattern, exceptionsAsKql, [], mockConfig);

        const booleanFilter = buildExceptionFilter({
          lists: exceptions,
          excludeExceptions: true,
          chunkSize: 1,
          config: mockConfig,
          indexPattern: mockIndexPattern,
        });
        expect(booleanFilter?.query.bool.should).toEqual(expected.bool.filter);
      });

      test('it should return boolean filter when single exception item includes "nested" entries', () => {
        const exceptions = [
          { ...getExceptionListItemSchemaMock(), entries: [getEntryNestedMock()] },
        ];
        const exceptionsAsKql = [
          {
            language: 'kuery',
            query: 'parent.field:{ host.name:"some host name" and host.name:("some host name") }',
          },
        ];
        const expected = buildEsQuery(mockIndexPattern, exceptionsAsKql, [], mockConfig);

        const booleanFilter = buildExceptionFilter({
          lists: exceptions,
          excludeExceptions: true,
          chunkSize: 1,
          config: mockConfig,
          indexPattern: mockIndexPattern,
        });
        expect(booleanFilter?.query.bool.should).toEqual(expected.bool.filter);
      });
    });
  });

  describe('chunkExceptions', () => {
    test('it should NOT split a single should clause as there is nothing to split on with chunkSize 1', () => {
      const exceptions = getExceptionListItemSchemaXMock(1);
      const chunks = chunkExceptions(exceptions, 1);
      expect(chunks).toHaveLength(1);
    });

    test('it should NOT split a single should clause as there is nothing to split on with chunkSize 2', () => {
      const exceptions = getExceptionListItemSchemaXMock(1);
      const chunks = chunkExceptions(exceptions, 2);
      expect(chunks).toHaveLength(1);
    });

    test('it should return an empty array if no exception items passed in', () => {
      const chunks = chunkExceptions([], 2);
      expect(chunks).toEqual([]);
    });

    test('it should split an array of size 2 into a length 2 array with chunks on "chunkSize: 1"', () => {
      const exceptions = getExceptionListItemSchemaXMock(2);
      const chunks = chunkExceptions(exceptions, 1);
      expect(chunks).toHaveLength(2);
    });

    test('it should split an array of size 2 into a length 4 array with chunks on "chunkSize: 1"', () => {
      const exceptions = getExceptionListItemSchemaXMock(4);
      const chunks = chunkExceptions(exceptions, 1);
      expect(chunks).toHaveLength(4);
    });

    test('it should split an array of size 4 into a length 2 array with chunks on "chunkSize: 2"', () => {
      const exceptions = getExceptionListItemSchemaXMock(4);
      const chunks = chunkExceptions(exceptions, 2);
      expect(chunks).toHaveLength(2);
    });

    test('it should NOT split an array of size 4 into any groups on "chunkSize: 5"', () => {
      const exceptions = getExceptionListItemSchemaXMock(4);
      const chunks = chunkExceptions(exceptions, 5);
      expect(chunks).toHaveLength(1);
    });

    test('it should split an array of size 4 into 2 groups on "chunkSize: 3"', () => {
      const exceptions = getExceptionListItemSchemaXMock(4);
      const chunks = chunkExceptions(exceptions, 3);
      expect(chunks).toHaveLength(2);
    });
  });

  describe('createOrClauses', () => {
    test('it should create filter with one item if only one exception item exists', () => {
      const booleanFilter = createOrClauses([
        getExceptionListItemSchemaMock(),
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
                  path: 'some.parentField',
                  query: {
                    bool: {
                      should: [{ match_phrase: { 'some.parentField.nested.field': 'some value' } }],
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
