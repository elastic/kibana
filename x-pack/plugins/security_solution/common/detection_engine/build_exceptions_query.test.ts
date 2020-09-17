/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  buildExceptionListQueries,
  buildExceptionItem,
  operatorBuilder,
  buildExists,
  buildMatch,
  buildMatchAny,
  buildEntry,
  getLanguageBooleanOperator,
  buildNested,
} from './build_exceptions_query';
import { EntryNested, EntryMatchAny, EntriesArray } from '../../../lists/common/schemas';
import { getExceptionListItemSchemaMock } from '../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { getEntryMatchMock } from '../../../lists/common/schemas/types/entry_match.mock';
import { getEntryMatchAnyMock } from '../../../lists/common/schemas/types/entry_match_any.mock';
import { getEntryExistsMock } from '../../../lists/common/schemas/types/entry_exists.mock';

describe('build_exceptions_query', () => {
  describe('getLanguageBooleanOperator', () => {
    test('it returns value as uppercase if language is "lucene"', () => {
      const result = getLanguageBooleanOperator({ language: 'lucene', value: 'not' });

      expect(result).toEqual('NOT');
    });

    test('it returns value as is if language is "kuery"', () => {
      const result = getLanguageBooleanOperator({ language: 'kuery', value: 'not' });

      expect(result).toEqual('not');
    });
  });

  describe('operatorBuilder', () => {
    describe('and language is kuery', () => {
      test('it returns empty string when operator is "included"', () => {
        const operator = operatorBuilder({ operator: 'included', language: 'kuery' });
        expect(operator).toEqual('');
      });
      test('it returns "not " when operator is "excluded"', () => {
        const operator = operatorBuilder({ operator: 'excluded', language: 'kuery' });
        expect(operator).toEqual('not ');
      });
    });

    describe('and language is lucene', () => {
      test('it returns empty string when operator is "included"', () => {
        const operator = operatorBuilder({ operator: 'included', language: 'lucene' });
        expect(operator).toEqual('');
      });
      test('it returns "NOT " when operator is "excluded"', () => {
        const operator = operatorBuilder({ operator: 'excluded', language: 'lucene' });
        expect(operator).toEqual('NOT ');
      });
    });
  });

  describe('buildExists', () => {
    describe('kuery', () => {
      test('it returns formatted wildcard string when operator is "excluded"', () => {
        const query = buildExists({
          entry: { ...getEntryExistsMock(), operator: 'excluded' },
          language: 'kuery',
        });
        expect(query).toEqual('not host.name:*');
      });
      test('it returns formatted wildcard string when operator is "included"', () => {
        const query = buildExists({
          entry: { ...getEntryExistsMock(), operator: 'included' },
          language: 'kuery',
        });
        expect(query).toEqual('host.name:*');
      });
    });

    describe('lucene', () => {
      test('it returns formatted wildcard string when operator is "excluded"', () => {
        const query = buildExists({
          entry: { ...getEntryExistsMock(), operator: 'excluded' },
          language: 'lucene',
        });
        expect(query).toEqual('NOT _exists_host.name');
      });
      test('it returns formatted wildcard string when operator is "included"', () => {
        const query = buildExists({
          entry: { ...getEntryExistsMock(), operator: 'included' },
          language: 'lucene',
        });
        expect(query).toEqual('_exists_host.name');
      });
    });
  });

  describe('buildMatch', () => {
    describe('kuery', () => {
      test('it returns formatted string when operator is "included"', () => {
        const query = buildMatch({
          entry: { ...getEntryMatchMock(), operator: 'included' },
          language: 'kuery',
        });
        expect(query).toEqual('host.name:"some host name"');
      });
      test('it returns formatted string when operator is "excluded"', () => {
        const query = buildMatch({
          entry: { ...getEntryMatchMock(), operator: 'excluded' },
          language: 'kuery',
        });
        expect(query).toEqual('not host.name:"some host name"');
      });
    });

    describe('lucene', () => {
      test('it returns formatted string when operator is "included"', () => {
        const query = buildMatch({
          entry: { ...getEntryMatchMock(), operator: 'included' },
          language: 'lucene',
        });
        expect(query).toEqual('host.name:"some host name"');
      });
      test('it returns formatted string when operator is "excluded"', () => {
        const query = buildMatch({
          entry: { ...getEntryMatchMock(), operator: 'excluded' },
          language: 'lucene',
        });
        expect(query).toEqual('NOT host.name:"some host name"');
      });
    });
  });

  describe('buildMatchAny', () => {
    const entryWithIncludedAndNoValues: EntryMatchAny = {
      ...getEntryMatchAnyMock(),
      field: 'host.name',
      value: [],
    };
    const entryWithIncludedAndOneValue: EntryMatchAny = {
      ...getEntryMatchAnyMock(),
      field: 'host.name',
      value: ['some host name'],
    };
    const entryWithExcludedAndTwoValues: EntryMatchAny = {
      ...getEntryMatchAnyMock(),
      field: 'host.name',
      value: ['some host name', 'auditd'],
      operator: 'excluded',
    };

    describe('kuery', () => {
      test('it returns empty string if given an empty array for "values"', () => {
        const exceptionSegment = buildMatchAny({
          entry: entryWithIncludedAndNoValues,
          language: 'kuery',
        });
        expect(exceptionSegment).toEqual('');
      });

      test('it returns formatted string when "values" includes only one item', () => {
        const exceptionSegment = buildMatchAny({
          entry: entryWithIncludedAndOneValue,
          language: 'kuery',
        });

        expect(exceptionSegment).toEqual('host.name:("some host name")');
      });

      test('it returns formatted string when operator is "included"', () => {
        const exceptionSegment = buildMatchAny({
          entry: { ...getEntryMatchAnyMock(), value: ['some host name', 'auditd'] },
          language: 'kuery',
        });

        expect(exceptionSegment).toEqual('host.name:("some host name" or "auditd")');
      });

      test('it returns formatted string when operator is "excluded"', () => {
        const exceptionSegment = buildMatchAny({
          entry: entryWithExcludedAndTwoValues,
          language: 'kuery',
        });

        expect(exceptionSegment).toEqual('not host.name:("some host name" or "auditd")');
      });
    });

    describe('lucene', () => {
      test('it returns formatted string when operator is "included"', () => {
        const exceptionSegment = buildMatchAny({
          entry: { ...getEntryMatchAnyMock(), value: ['some host name', 'auditd'] },
          language: 'lucene',
        });

        expect(exceptionSegment).toEqual('host.name:("some host name" OR "auditd")');
      });
      test('it returns formatted string when operator is "excluded"', () => {
        const exceptionSegment = buildMatchAny({
          entry: entryWithExcludedAndTwoValues,
          language: 'lucene',
        });

        expect(exceptionSegment).toEqual('NOT host.name:("some host name" OR "auditd")');
      });
      test('it returns formatted string when "values" includes only one item', () => {
        const exceptionSegment = buildMatchAny({
          entry: entryWithIncludedAndOneValue,
          language: 'lucene',
        });

        expect(exceptionSegment).toEqual('host.name:("some host name")');
      });
    });
  });

  describe('buildNested', () => {
    // NOTE: Only KQL supports nested
    describe('kuery', () => {
      test('it returns formatted query when one item in nested entry', () => {
        const entry: EntryNested = {
          field: 'parent',
          type: 'nested',
          entries: [
            {
              ...getEntryMatchMock(),
              field: 'nestedField',
              operator: 'included',
              value: 'value-1',
            },
          ],
        };
        const result = buildNested({ entry, language: 'kuery' });

        expect(result).toEqual('parent:{ nestedField:"value-1" }');
      });

      test('it returns formatted query when entry item is "exists"', () => {
        const entry: EntryNested = {
          field: 'parent',
          type: 'nested',
          entries: [{ ...getEntryExistsMock(), field: 'nestedField', operator: 'included' }],
        };
        const result = buildNested({ entry, language: 'kuery' });

        expect(result).toEqual('parent:{ nestedField:* }');
      });

      test('it returns formatted query when entry item is "exists" and operator is "excluded"', () => {
        const entry: EntryNested = {
          field: 'parent',
          type: 'nested',
          entries: [{ ...getEntryExistsMock(), field: 'nestedField', operator: 'excluded' }],
        };
        const result = buildNested({ entry, language: 'kuery' });

        expect(result).toEqual('parent:{ not nestedField:* }');
      });

      test('it returns formatted query when entry item is "match_any"', () => {
        const entry: EntryNested = {
          field: 'parent',
          type: 'nested',
          entries: [
            {
              ...getEntryMatchAnyMock(),
              field: 'nestedField',
              operator: 'included',
              value: ['value1', 'value2'],
            },
          ],
        };
        const result = buildNested({ entry, language: 'kuery' });

        expect(result).toEqual('parent:{ nestedField:("value1" or "value2") }');
      });

      test('it returns formatted query when entry item is "match_any" and operator is "excluded"', () => {
        const entry: EntryNested = {
          field: 'parent',
          type: 'nested',
          entries: [
            {
              ...getEntryMatchAnyMock(),
              field: 'nestedField',
              operator: 'excluded',
              value: ['value1', 'value2'],
            },
          ],
        };
        const result = buildNested({ entry, language: 'kuery' });

        expect(result).toEqual('parent:{ not nestedField:("value1" or "value2") }');
      });

      test('it returns formatted query when multiple items in nested entry', () => {
        const entry: EntryNested = {
          field: 'parent',
          type: 'nested',
          entries: [
            {
              ...getEntryMatchMock(),
              field: 'nestedField',
              operator: 'included',
              value: 'value-1',
            },
            {
              ...getEntryMatchMock(),
              field: 'nestedFieldB',
              operator: 'included',
              value: 'value-2',
            },
          ],
        };
        const result = buildNested({ entry, language: 'kuery' });

        expect(result).toEqual('parent:{ nestedField:"value-1" and nestedFieldB:"value-2" }');
      });
    });
  });

  describe('buildEntry', () => {
    describe('kuery', () => {
      test('it returns formatted wildcard string when "type" is "exists"', () => {
        const result = buildEntry({
          entry: { ...getEntryExistsMock(), operator: 'included' },
          language: 'kuery',
        });
        expect(result).toEqual('host.name:*');
      });

      test('it returns formatted string when "type" is "match"', () => {
        const result = buildEntry({
          entry: { ...getEntryMatchMock(), operator: 'included' },
          language: 'kuery',
        });
        expect(result).toEqual('host.name:"some host name"');
      });

      test('it returns formatted string when "type" is "match_any"', () => {
        const result = buildEntry({
          entry: { ...getEntryMatchAnyMock(), value: ['some host name', 'auditd'] },
          language: 'kuery',
        });
        expect(result).toEqual('host.name:("some host name" or "auditd")');
      });
    });

    describe('lucene', () => {
      test('it returns formatted wildcard string when "type" is "exists"', () => {
        const result = buildEntry({
          entry: { ...getEntryExistsMock(), operator: 'included' },
          language: 'lucene',
        });
        expect(result).toEqual('_exists_host.name');
      });

      test('it returns formatted string when "type" is "match"', () => {
        const result = buildEntry({
          entry: { ...getEntryMatchMock(), operator: 'included' },
          language: 'lucene',
        });
        expect(result).toEqual('host.name:"some host name"');
      });

      test('it returns formatted string when "type" is "match_any"', () => {
        const result = buildEntry({
          entry: { ...getEntryMatchAnyMock(), value: ['some host name', 'auditd'] },
          language: 'lucene',
        });
        expect(result).toEqual('host.name:("some host name" OR "auditd")');
      });
    });
  });

  describe('buildExceptionItem', () => {
    test('it returns empty string if empty lists array passed in', () => {
      const query = buildExceptionItem({
        language: 'kuery',
        entries: [],
      });

      expect(query).toEqual('');
    });

    test('it returns expected query when more than one item in exception item', () => {
      const payload: EntriesArray = [
        { ...getEntryMatchAnyMock(), field: 'b' },
        { ...getEntryMatchMock(), field: 'c', operator: 'excluded', value: 'value-3' },
      ];
      const query = buildExceptionItem({
        language: 'kuery',
        entries: payload,
      });
      const expectedQuery = 'b:("some host name") and not c:"value-3"';

      expect(query).toEqual(expectedQuery);
    });

    test('it returns expected query when exception item includes nested value', () => {
      const entries: EntriesArray = [
        { ...getEntryMatchAnyMock(), field: 'b' },
        {
          field: 'parent',
          type: 'nested',
          entries: [
            {
              ...getEntryMatchMock(),
              field: 'nestedField',
              operator: 'included',
              value: 'value-3',
            },
          ],
        },
      ];
      const query = buildExceptionItem({
        language: 'kuery',
        entries,
      });
      const expectedQuery = 'b:("some host name") and parent:{ nestedField:"value-3" }';

      expect(query).toEqual(expectedQuery);
    });

    test('it returns expected query when exception item includes multiple items and nested "and" values', () => {
      const entries: EntriesArray = [
        { ...getEntryMatchAnyMock(), field: 'b' },
        {
          field: 'parent',
          type: 'nested',
          entries: [
            {
              ...getEntryMatchMock(),
              field: 'nestedField',
              operator: 'included',
              value: 'value-3',
            },
          ],
        },
        { ...getEntryExistsMock(), field: 'd' },
      ];
      const query = buildExceptionItem({
        language: 'kuery',
        entries,
      });
      const expectedQuery = 'b:("some host name") and parent:{ nestedField:"value-3" } and d:*';
      expect(query).toEqual(expectedQuery);
    });

    test('it returns expected query when language is "lucene"', () => {
      const entries: EntriesArray = [
        { ...getEntryMatchAnyMock(), field: 'b' },
        {
          field: 'parent',
          type: 'nested',
          entries: [
            {
              ...getEntryMatchMock(),
              field: 'nestedField',
              operator: 'excluded',
              value: 'value-3',
            },
          ],
        },
        { ...getEntryExistsMock(), field: 'e', operator: 'excluded' },
      ];
      const query = buildExceptionItem({
        language: 'lucene',
        entries,
      });
      const expectedQuery =
        'b:("some host name") AND parent:{ NOT nestedField:"value-3" } AND NOT _exists_e';
      expect(query).toEqual(expectedQuery);
    });

    describe('exists', () => {
      test('it returns expected query when list includes single list item with operator of "included"', () => {
        const entries: EntriesArray = [{ ...getEntryExistsMock(), field: 'b' }];
        const query = buildExceptionItem({
          language: 'kuery',
          entries,
        });
        const expectedQuery = 'b:*';

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes single list item with operator of "excluded"', () => {
        const entries: EntriesArray = [
          { ...getEntryExistsMock(), field: 'b', operator: 'excluded' },
        ];
        const query = buildExceptionItem({
          language: 'kuery',
          entries,
        });
        const expectedQuery = 'not b:*';

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when exception item includes entry item with "and" values', () => {
        const entries: EntriesArray = [
          { ...getEntryExistsMock(), field: 'b', operator: 'excluded' },
          {
            field: 'parent',
            type: 'nested',
            entries: [
              { ...getEntryMatchMock(), field: 'c', operator: 'included', value: 'value-1' },
            ],
          },
        ];
        const query = buildExceptionItem({
          language: 'kuery',
          entries,
        });
        const expectedQuery = 'not b:* and parent:{ c:"value-1" }';

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes multiple items', () => {
        const entries: EntriesArray = [
          { ...getEntryExistsMock(), field: 'b' },
          {
            field: 'parent',
            type: 'nested',
            entries: [
              { ...getEntryMatchMock(), field: 'c', operator: 'excluded', value: 'value-1' },
              { ...getEntryMatchMock(), field: 'd', value: 'value-2' },
            ],
          },
          { ...getEntryExistsMock(), field: 'e' },
        ];
        const query = buildExceptionItem({
          language: 'kuery',
          entries,
        });
        const expectedQuery = 'b:* and parent:{ not c:"value-1" and d:"value-2" } and e:*';

        expect(query).toEqual(expectedQuery);
      });
    });

    describe('match', () => {
      test('it returns expected query when list includes single list item with operator of "included"', () => {
        const entries: EntriesArray = [{ ...getEntryMatchMock(), field: 'b', value: 'value' }];
        const query = buildExceptionItem({
          language: 'kuery',
          entries,
        });
        const expectedQuery = 'b:"value"';

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes single list item with operator of "excluded"', () => {
        const entries: EntriesArray = [
          { ...getEntryMatchMock(), field: 'b', operator: 'excluded', value: 'value' },
        ];
        const query = buildExceptionItem({
          language: 'kuery',
          entries,
        });
        const expectedQuery = 'not b:"value"';

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes list item with "and" values', () => {
        const entries: EntriesArray = [
          { ...getEntryMatchMock(), field: 'b', operator: 'excluded', value: 'value' },
          {
            field: 'parent',
            type: 'nested',
            entries: [
              { ...getEntryMatchMock(), field: 'c', operator: 'included', value: 'valueC' },
            ],
          },
        ];
        const query = buildExceptionItem({
          language: 'kuery',
          entries,
        });
        const expectedQuery = 'not b:"value" and parent:{ c:"valueC" }';

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes multiple items', () => {
        const entries: EntriesArray = [
          { ...getEntryMatchMock(), field: 'b', value: 'value' },
          {
            field: 'parent',
            type: 'nested',
            entries: [
              { ...getEntryMatchMock(), field: 'c', operator: 'excluded', value: 'valueC' },
              { ...getEntryMatchMock(), field: 'd', operator: 'excluded', value: 'valueD' },
            ],
          },
          { ...getEntryMatchMock(), field: 'e', value: 'valueE' },
        ];
        const query = buildExceptionItem({
          language: 'kuery',
          entries,
        });
        const expectedQuery =
          'b:"value" and parent:{ not c:"valueC" and not d:"valueD" } and e:"valueE"';

        expect(query).toEqual(expectedQuery);
      });
    });

    describe('match_any', () => {
      test('it returns expected query when list includes single list item with operator of "included"', () => {
        const entries: EntriesArray = [{ ...getEntryMatchAnyMock(), field: 'b' }];
        const query = buildExceptionItem({
          language: 'kuery',
          entries,
        });
        const expectedQuery = 'b:("some host name")';

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes single list item with operator of "excluded"', () => {
        const entries: EntriesArray = [
          { ...getEntryMatchAnyMock(), field: 'b', operator: 'excluded' },
        ];
        const query = buildExceptionItem({
          language: 'kuery',
          entries,
        });
        const expectedQuery = 'not b:("some host name")';

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes list item with nested values', () => {
        const entries: EntriesArray = [
          { ...getEntryMatchAnyMock(), field: 'b', operator: 'excluded' },
          {
            field: 'parent',
            type: 'nested',
            entries: [
              { ...getEntryMatchMock(), field: 'c', operator: 'excluded', value: 'valueC' },
            ],
          },
        ];
        const query = buildExceptionItem({
          language: 'kuery',
          entries,
        });
        const expectedQuery = 'not b:("some host name") and parent:{ not c:"valueC" }';

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes multiple items', () => {
        const entries: EntriesArray = [
          { ...getEntryMatchAnyMock(), field: 'b' },
          { ...getEntryMatchAnyMock(), field: 'c' },
        ];
        const query = buildExceptionItem({
          language: 'kuery',
          entries,
        });
        const expectedQuery = 'b:("some host name") and c:("some host name")';

        expect(query).toEqual(expectedQuery);
      });
    });
  });

  describe('buildExceptionListQueries', () => {
    test('it returns empty array if lists is empty array', () => {
      const query = buildExceptionListQueries({ language: 'kuery', lists: [] });

      expect(query).toEqual([]);
    });

    test('it returns empty array if lists is undefined', () => {
      const query = buildExceptionListQueries({ language: 'kuery', lists: undefined });

      expect(query).toEqual([]);
    });

    test('it returns expected query when lists exist and language is "kuery"', () => {
      const payload = getExceptionListItemSchemaMock();
      const payload2 = getExceptionListItemSchemaMock();
      payload2.entries = [
        { ...getEntryMatchAnyMock(), field: 'b' },
        {
          field: 'parent',
          type: 'nested',
          entries: [
            { ...getEntryMatchMock(), field: 'c', operator: 'included', value: 'valueC' },
            { ...getEntryMatchMock(), field: 'd', operator: 'included', value: 'valueD' },
          ],
        },
        { ...getEntryMatchAnyMock(), field: 'e', operator: 'excluded' },
      ];
      const queries = buildExceptionListQueries({
        language: 'kuery',
        lists: [payload, payload2],
      });
      const expectedQueries = [
        {
          query:
            'some.parentField:{ nested.field:"some value" } and some.not.nested.field:"some value"',
          language: 'kuery',
        },
        {
          query:
            'b:("some host name") and parent:{ c:"valueC" and d:"valueD" } and not e:("some host name")',
          language: 'kuery',
        },
      ];

      expect(queries).toEqual(expectedQueries);
    });

    test('it returns expected query when lists exist and language is "lucene"', () => {
      const payload = getExceptionListItemSchemaMock();
      payload.entries = [
        { ...getEntryMatchAnyMock(), field: 'a' },
        { ...getEntryMatchAnyMock(), field: 'b' },
      ];
      const payload2 = getExceptionListItemSchemaMock();
      payload2.entries = [
        { ...getEntryMatchAnyMock(), field: 'c' },
        { ...getEntryMatchAnyMock(), field: 'd' },
      ];
      const queries = buildExceptionListQueries({
        language: 'lucene',
        lists: [payload, payload2],
      });
      const expectedQueries = [
        {
          query: 'a:("some host name") AND b:("some host name")',
          language: 'lucene',
        },
        {
          query: 'c:("some host name") AND d:("some host name")',
          language: 'lucene',
        },
      ];

      expect(queries).toEqual(expectedQueries);
    });

    test('it builds correct queries for nested excluded fields', () => {
      const payload = getExceptionListItemSchemaMock();
      const payload2 = getExceptionListItemSchemaMock();
      payload2.entries = [
        { ...getEntryMatchAnyMock(), field: 'b' },
        {
          field: 'parent',
          type: 'nested',
          entries: [
            // TODO: these operators are not being respected. buildNested needs to be updated
            { ...getEntryMatchMock(), field: 'c', operator: 'excluded', value: 'valueC' },
            { ...getEntryMatchMock(), field: 'd', operator: 'excluded', value: 'valueD' },
          ],
        },
        { ...getEntryMatchAnyMock(), field: 'e' },
      ];
      const queries = buildExceptionListQueries({
        language: 'kuery',
        lists: [payload, payload2],
      });
      const expectedQueries = [
        {
          query:
            'some.parentField:{ nested.field:"some value" } and some.not.nested.field:"some value"',
          language: 'kuery',
        },
        {
          query:
            'b:("some host name") and parent:{ not c:"valueC" and not d:"valueD" } and e:("some host name")',
          language: 'kuery',
        },
      ];

      expect(queries).toEqual(expectedQueries);
    });
  });
});
