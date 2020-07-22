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
import {
  EntryNested,
  EntryExists,
  EntryMatch,
  EntryMatchAny,
  EntriesArray,
  Operator,
} from '../../../lists/common/schemas';
import { getExceptionListItemSchemaMock } from '../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { getEntryMatchMock } from '../../../lists/common/schemas/types/entry_match.mock';
import { getEntryMatchAnyMock } from '../../../lists/common/schemas/types/entry_match_any.mock';
import { getEntryExistsMock } from '../../../lists/common/schemas/types/entry_exists.mock';

describe('build_exceptions_query', () => {
  const makeMatchEntry = ({
    field,
    value = 'value-1',
    operator = 'included',
  }: {
    field: string;
    value?: string;
    operator?: Operator;
  }): EntryMatch => {
    return {
      field,
      operator,
      type: 'match',
      value,
    };
  };
  const makeMatchAnyEntry = ({
    field,
    operator = 'included',
    value = ['value-1', 'value-2'],
  }: {
    field: string;
    operator?: Operator;
    value?: string[];
  }): EntryMatchAny => {
    return {
      field,
      operator,
      value,
      type: 'match_any',
    };
  };
  const makeExistsEntry = ({
    field,
    operator = 'included',
  }: {
    field: string;
    operator?: Operator;
  }): EntryExists => {
    return {
      field,
      operator,
      type: 'exists',
    };
  };
  const matchEntryWithIncluded: EntryMatch = makeMatchEntry({
    field: 'host.name',
    value: 'suricata',
  });
  const matchEntryWithExcluded: EntryMatch = makeMatchEntry({
    field: 'host.name',
    value: 'suricata',
    operator: 'excluded',
  });
  const matchAnyEntryWithIncludedAndTwoValues: EntryMatchAny = makeMatchAnyEntry({
    field: 'host.name',
    value: ['suricata', 'auditd'],
  });
  const existsEntryWithIncluded: EntryExists = makeExistsEntry({
    field: 'host.name',
  });
  const existsEntryWithExcluded: EntryExists = makeExistsEntry({
    field: 'host.name',
    operator: 'excluded',
  });

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
          entry: existsEntryWithExcluded,
          language: 'kuery',
        });
        expect(query).toEqual('not host.name:*');
      });
      test('it returns formatted wildcard string when operator is "included"', () => {
        const query = buildExists({
          entry: existsEntryWithIncluded,
          language: 'kuery',
        });
        expect(query).toEqual('host.name:*');
      });
    });

    describe('lucene', () => {
      test('it returns formatted wildcard string when operator is "excluded"', () => {
        const query = buildExists({
          entry: existsEntryWithExcluded,
          language: 'lucene',
        });
        expect(query).toEqual('NOT _exists_host.name');
      });
      test('it returns formatted wildcard string when operator is "included"', () => {
        const query = buildExists({
          entry: existsEntryWithIncluded,
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
          entry: matchEntryWithIncluded,
          language: 'kuery',
        });
        expect(query).toEqual('host.name:"suricata"');
      });
      test('it returns formatted string when operator is "excluded"', () => {
        const query = buildMatch({
          entry: matchEntryWithExcluded,
          language: 'kuery',
        });
        expect(query).toEqual('not host.name:"suricata"');
      });
    });

    describe('lucene', () => {
      test('it returns formatted string when operator is "included"', () => {
        const query = buildMatch({
          entry: matchEntryWithIncluded,
          language: 'lucene',
        });
        expect(query).toEqual('host.name:"suricata"');
      });
      test('it returns formatted string when operator is "excluded"', () => {
        const query = buildMatch({
          entry: matchEntryWithExcluded,
          language: 'lucene',
        });
        expect(query).toEqual('NOT host.name:"suricata"');
      });
    });
  });

  describe('buildMatchAny', () => {
    const entryWithIncludedAndNoValues: EntryMatchAny = makeMatchAnyEntry({
      field: 'host.name',
      value: [],
    });
    const entryWithIncludedAndOneValue: EntryMatchAny = makeMatchAnyEntry({
      field: 'host.name',
      value: ['suricata'],
    });
    const entryWithExcludedAndTwoValues: EntryMatchAny = makeMatchAnyEntry({
      field: 'host.name',
      value: ['suricata', 'auditd'],
      operator: 'excluded',
    });

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

        expect(exceptionSegment).toEqual('host.name:("suricata")');
      });

      test('it returns formatted string when operator is "included"', () => {
        const exceptionSegment = buildMatchAny({
          entry: matchAnyEntryWithIncludedAndTwoValues,
          language: 'kuery',
        });

        expect(exceptionSegment).toEqual('host.name:("suricata" or "auditd")');
      });

      test('it returns formatted string when operator is "excluded"', () => {
        const exceptionSegment = buildMatchAny({
          entry: entryWithExcludedAndTwoValues,
          language: 'kuery',
        });

        expect(exceptionSegment).toEqual('not host.name:("suricata" or "auditd")');
      });
    });

    describe('lucene', () => {
      test('it returns formatted string when operator is "included"', () => {
        const exceptionSegment = buildMatchAny({
          entry: matchAnyEntryWithIncludedAndTwoValues,
          language: 'lucene',
        });

        expect(exceptionSegment).toEqual('host.name:("suricata" OR "auditd")');
      });
      test('it returns formatted string when operator is "excluded"', () => {
        const exceptionSegment = buildMatchAny({
          entry: entryWithExcludedAndTwoValues,
          language: 'lucene',
        });

        expect(exceptionSegment).toEqual('NOT host.name:("suricata" OR "auditd")');
      });
      test('it returns formatted string when "values" includes only one item', () => {
        const exceptionSegment = buildMatchAny({
          entry: entryWithIncludedAndOneValue,
          language: 'lucene',
        });

        expect(exceptionSegment).toEqual('host.name:("suricata")');
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
          entry: existsEntryWithIncluded,
          language: 'kuery',
        });
        expect(result).toEqual('host.name:*');
      });

      test('it returns formatted string when "type" is "match"', () => {
        const result = buildEntry({
          entry: matchEntryWithIncluded,
          language: 'kuery',
        });
        expect(result).toEqual('host.name:"suricata"');
      });

      test('it returns formatted string when "type" is "match_any"', () => {
        const result = buildEntry({
          entry: matchAnyEntryWithIncludedAndTwoValues,
          language: 'kuery',
        });
        expect(result).toEqual('host.name:("suricata" or "auditd")');
      });
    });

    describe('lucene', () => {
      test('it returns formatted wildcard string when "type" is "exists"', () => {
        const result = buildEntry({
          entry: existsEntryWithIncluded,
          language: 'lucene',
        });
        expect(result).toEqual('_exists_host.name');
      });

      test('it returns formatted string when "type" is "match"', () => {
        const result = buildEntry({
          entry: matchEntryWithIncluded,
          language: 'lucene',
        });
        expect(result).toEqual('host.name:"suricata"');
      });

      test('it returns formatted string when "type" is "match_any"', () => {
        const result = buildEntry({
          entry: matchAnyEntryWithIncludedAndTwoValues,
          language: 'lucene',
        });
        expect(result).toEqual('host.name:("suricata" OR "auditd")');
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
        makeMatchAnyEntry({ field: 'b' }),
        makeMatchEntry({ field: 'c', operator: 'excluded', value: 'value-3' }),
      ];
      const query = buildExceptionItem({
        language: 'kuery',
        entries: payload,
      });
      const expectedQuery = 'b:("value-1" or "value-2") and not c:"value-3"';

      expect(query).toEqual(expectedQuery);
    });

    test('it returns expected query when exception item includes nested value', () => {
      const entries: EntriesArray = [
        makeMatchAnyEntry({ field: 'b' }),
        {
          field: 'parent',
          type: 'nested',
          entries: [
            makeMatchEntry({ field: 'nestedField', operator: 'included', value: 'value-3' }),
          ],
        },
      ];
      const query = buildExceptionItem({
        language: 'kuery',
        entries,
      });
      const expectedQuery = 'b:("value-1" or "value-2") and parent:{ nestedField:"value-3" }';

      expect(query).toEqual(expectedQuery);
    });

    test('it returns expected query when exception item includes multiple items and nested "and" values', () => {
      const entries: EntriesArray = [
        makeMatchAnyEntry({ field: 'b' }),
        {
          field: 'parent',
          type: 'nested',
          entries: [
            makeMatchEntry({ field: 'nestedField', operator: 'included', value: 'value-3' }),
          ],
        },
        makeExistsEntry({ field: 'd' }),
      ];
      const query = buildExceptionItem({
        language: 'kuery',
        entries,
      });
      const expectedQuery =
        'b:("value-1" or "value-2") and parent:{ nestedField:"value-3" } and d:*';
      expect(query).toEqual(expectedQuery);
    });

    test('it returns expected query when language is "lucene"', () => {
      const entries: EntriesArray = [
        makeMatchAnyEntry({ field: 'b' }),
        {
          field: 'parent',
          type: 'nested',
          entries: [
            makeMatchEntry({ field: 'nestedField', operator: 'excluded', value: 'value-3' }),
          ],
        },
        makeExistsEntry({ field: 'e', operator: 'excluded' }),
      ];
      const query = buildExceptionItem({
        language: 'lucene',
        entries,
      });
      const expectedQuery =
        'b:("value-1" OR "value-2") AND parent:{ NOT nestedField:"value-3" } AND NOT _exists_e';
      expect(query).toEqual(expectedQuery);
    });

    describe('exists', () => {
      test('it returns expected query when list includes single list item with operator of "included"', () => {
        const entries: EntriesArray = [makeExistsEntry({ field: 'b' })];
        const query = buildExceptionItem({
          language: 'kuery',
          entries,
        });
        const expectedQuery = 'b:*';

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes single list item with operator of "excluded"', () => {
        const entries: EntriesArray = [makeExistsEntry({ field: 'b', operator: 'excluded' })];
        const query = buildExceptionItem({
          language: 'kuery',
          entries,
        });
        const expectedQuery = 'not b:*';

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when exception item includes entry item with "and" values', () => {
        const entries: EntriesArray = [
          makeExistsEntry({ field: 'b', operator: 'excluded' }),
          {
            field: 'parent',
            type: 'nested',
            entries: [makeMatchEntry({ field: 'c', operator: 'included', value: 'value-1' })],
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
          makeExistsEntry({ field: 'b' }),
          {
            field: 'parent',
            type: 'nested',
            entries: [
              makeMatchEntry({ field: 'c', operator: 'excluded', value: 'value-1' }),
              makeMatchEntry({ field: 'd', value: 'value-2' }),
            ],
          },
          makeExistsEntry({ field: 'e' }),
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
        const entries: EntriesArray = [makeMatchEntry({ field: 'b', value: 'value' })];
        const query = buildExceptionItem({
          language: 'kuery',
          entries,
        });
        const expectedQuery = 'b:"value"';

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes single list item with operator of "excluded"', () => {
        const entries: EntriesArray = [
          makeMatchEntry({ field: 'b', operator: 'excluded', value: 'value' }),
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
          makeMatchEntry({ field: 'b', operator: 'excluded', value: 'value' }),
          {
            field: 'parent',
            type: 'nested',
            entries: [makeMatchEntry({ field: 'c', operator: 'included', value: 'valueC' })],
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
          makeMatchEntry({ field: 'b', value: 'value' }),
          {
            field: 'parent',
            type: 'nested',
            entries: [
              makeMatchEntry({ field: 'c', operator: 'excluded', value: 'valueC' }),
              makeMatchEntry({ field: 'd', operator: 'excluded', value: 'valueD' }),
            ],
          },
          makeMatchEntry({ field: 'e', value: 'valueE' }),
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
        const entries: EntriesArray = [makeMatchAnyEntry({ field: 'b' })];
        const query = buildExceptionItem({
          language: 'kuery',
          entries,
        });
        const expectedQuery = 'b:("value-1" or "value-2")';

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes single list item with operator of "excluded"', () => {
        const entries: EntriesArray = [makeMatchAnyEntry({ field: 'b', operator: 'excluded' })];
        const query = buildExceptionItem({
          language: 'kuery',
          entries,
        });
        const expectedQuery = 'not b:("value-1" or "value-2")';

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes list item with nested values', () => {
        const entries: EntriesArray = [
          makeMatchAnyEntry({ field: 'b', operator: 'excluded' }),
          {
            field: 'parent',
            type: 'nested',
            entries: [makeMatchEntry({ field: 'c', operator: 'excluded', value: 'valueC' })],
          },
        ];
        const query = buildExceptionItem({
          language: 'kuery',
          entries,
        });
        const expectedQuery = 'not b:("value-1" or "value-2") and parent:{ not c:"valueC" }';

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes multiple items', () => {
        const entries: EntriesArray = [
          makeMatchAnyEntry({ field: 'b' }),
          makeMatchAnyEntry({ field: 'c' }),
        ];
        const query = buildExceptionItem({
          language: 'kuery',
          entries,
        });
        const expectedQuery = 'b:("value-1" or "value-2") and c:("value-1" or "value-2")';

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
        makeMatchAnyEntry({ field: 'b' }),
        {
          field: 'parent',
          type: 'nested',
          entries: [
            makeMatchEntry({ field: 'c', operator: 'included', value: 'valueC' }),
            makeMatchEntry({ field: 'd', operator: 'included', value: 'valueD' }),
          ],
        },
        makeMatchAnyEntry({ field: 'e', operator: 'excluded' }),
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
            'b:("value-1" or "value-2") and parent:{ c:"valueC" and d:"valueD" } and not e:("value-1" or "value-2")',
          language: 'kuery',
        },
      ];

      expect(queries).toEqual(expectedQueries);
    });

    test('it returns expected query when lists exist and language is "lucene"', () => {
      const payload = getExceptionListItemSchemaMock();
      payload.entries = [makeMatchAnyEntry({ field: 'a' }), makeMatchAnyEntry({ field: 'b' })];
      const payload2 = getExceptionListItemSchemaMock();
      payload2.entries = [makeMatchAnyEntry({ field: 'c' }), makeMatchAnyEntry({ field: 'd' })];
      const queries = buildExceptionListQueries({
        language: 'lucene',
        lists: [payload, payload2],
      });
      const expectedQueries = [
        {
          query: 'a:("value-1" OR "value-2") AND b:("value-1" OR "value-2")',
          language: 'lucene',
        },
        {
          query: 'c:("value-1" OR "value-2") AND d:("value-1" OR "value-2")',
          language: 'lucene',
        },
      ];

      expect(queries).toEqual(expectedQueries);
    });

    test('it builds correct queries for nested excluded fields', () => {
      const payload = getExceptionListItemSchemaMock();
      const payload2 = getExceptionListItemSchemaMock();
      payload2.entries = [
        makeMatchAnyEntry({ field: 'b' }),
        {
          field: 'parent',
          type: 'nested',
          entries: [
            // TODO: these operators are not being respected. buildNested needs to be updated
            makeMatchEntry({ field: 'c', operator: 'excluded', value: 'valueC' }),
            makeMatchEntry({ field: 'd', operator: 'excluded', value: 'valueD' }),
          ],
        },
        makeMatchAnyEntry({ field: 'e' }),
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
            'b:("value-1" or "value-2") and parent:{ not c:"valueC" and not d:"valueD" } and e:("value-1" or "value-2")',
          language: 'kuery',
        },
      ];

      expect(queries).toEqual(expectedQueries);
    });
  });
});
