/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  buildQueryExceptions,
  buildExceptionItemEntries,
  operatorBuilder,
  buildExists,
  buildMatch,
  buildMatchAny,
  evaluateValues,
  formatQuery,
  getLanguageBooleanOperator,
  buildNested,
} from './build_exceptions_query';
import {
  EntryNested,
  EntryExists,
  EntryMatch,
  EntryMatchAny,
  EntriesArray,
} from '../../../lists/common/schemas';
import { getExceptionListItemSchemaMock } from '../../../lists/common/schemas/response/exception_list_item_schema.mock';

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
    describe('kuery', () => {
      test('it returns "not " when operator is "included"', () => {
        const operator = operatorBuilder({ operator: 'included', language: 'kuery' });

        expect(operator).toEqual('not ');
      });

      test('it returns empty string when operator is "excluded"', () => {
        const operator = operatorBuilder({ operator: 'excluded', language: 'kuery' });

        expect(operator).toEqual('');
      });
    });

    describe('lucene', () => {
      test('it returns "NOT " when operator is "included"', () => {
        const operator = operatorBuilder({ operator: 'included', language: 'lucene' });

        expect(operator).toEqual('NOT ');
      });

      test('it returns empty string when operator is "excluded"', () => {
        const operator = operatorBuilder({ operator: 'excluded', language: 'lucene' });

        expect(operator).toEqual('');
      });
    });
  });

  describe('buildExists', () => {
    describe('kuery', () => {
      test('it returns formatted wildcard string when operator is "excluded"', () => {
        const query = buildExists({
          item: { type: 'exists', operator: 'excluded', field: 'host.name' },
          language: 'kuery',
        });

        expect(query).toEqual('host.name:*');
      });

      test('it returns formatted wildcard string when operator is "included"', () => {
        const query = buildExists({
          item: { type: 'exists', operator: 'included', field: 'host.name' },
          language: 'kuery',
        });

        expect(query).toEqual('not host.name:*');
      });
    });

    describe('lucene', () => {
      test('it returns formatted wildcard string when operator is "excluded"', () => {
        const query = buildExists({
          item: { type: 'exists', operator: 'excluded', field: 'host.name' },
          language: 'lucene',
        });

        expect(query).toEqual('_exists_host.name');
      });

      test('it returns formatted wildcard string when operator is "included"', () => {
        const query = buildExists({
          item: { type: 'exists', operator: 'included', field: 'host.name' },
          language: 'lucene',
        });

        expect(query).toEqual('NOT _exists_host.name');
      });
    });
  });

  describe('buildMatch', () => {
    describe('kuery', () => {
      test('it returns formatted string when operator is "included"', () => {
        const query = buildMatch({
          item: {
            type: 'match',
            operator: 'included',
            field: 'host.name',
            value: 'suricata',
          },
          language: 'kuery',
        });

        expect(query).toEqual('not host.name:suricata');
      });

      test('it returns formatted string when operator is "excluded"', () => {
        const query = buildMatch({
          item: {
            type: 'match',
            operator: 'excluded',
            field: 'host.name',
            value: 'suricata',
          },
          language: 'kuery',
        });

        expect(query).toEqual('host.name:suricata');
      });
    });

    describe('lucene', () => {
      test('it returns formatted string when operator is "included"', () => {
        const query = buildMatch({
          item: {
            type: 'match',
            operator: 'included',
            field: 'host.name',
            value: 'suricata',
          },
          language: 'lucene',
        });

        expect(query).toEqual('NOT host.name:suricata');
      });

      test('it returns formatted string when operator is "excluded"', () => {
        const query = buildMatch({
          item: {
            type: 'match',
            operator: 'excluded',
            field: 'host.name',
            value: 'suricata',
          },
          language: 'lucene',
        });

        expect(query).toEqual('host.name:suricata');
      });
    });
  });

  describe('buildMatchAny', () => {
    describe('kuery', () => {
      test('it returns empty string if given an empty array for "values"', () => {
        const exceptionSegment = buildMatchAny({
          item: {
            operator: 'included',
            field: 'host.name',
            value: [],
            type: 'match_any',
          },
          language: 'kuery',
        });

        expect(exceptionSegment).toEqual('');
      });

      test('it returns formatted string when "values" includes only one item', () => {
        const exceptionSegment = buildMatchAny({
          item: {
            operator: 'included',
            field: 'host.name',
            value: ['suricata'],
            type: 'match_any',
          },
          language: 'kuery',
        });

        expect(exceptionSegment).toEqual('not host.name:(suricata)');
      });

      test('it returns formatted string when operator is "included"', () => {
        const exceptionSegment = buildMatchAny({
          item: {
            operator: 'included',
            field: 'host.name',
            value: ['suricata', 'auditd'],
            type: 'match_any',
          },
          language: 'kuery',
        });

        expect(exceptionSegment).toEqual('not host.name:(suricata or auditd)');
      });

      test('it returns formatted string when operator is "excluded"', () => {
        const exceptionSegment = buildMatchAny({
          item: {
            operator: 'excluded',
            field: 'host.name',
            value: ['suricata', 'auditd'],
            type: 'match_any',
          },
          language: 'kuery',
        });

        expect(exceptionSegment).toEqual('host.name:(suricata or auditd)');
      });
    });

    describe('lucene', () => {
      test('it returns formatted string when operator is "included"', () => {
        const exceptionSegment = buildMatchAny({
          item: {
            operator: 'included',
            field: 'host.name',
            value: ['suricata', 'auditd'],
            type: 'match_any',
          },
          language: 'lucene',
        });

        expect(exceptionSegment).toEqual('NOT host.name:(suricata OR auditd)');
      });

      test('it returns formatted string when operator is "excluded"', () => {
        const exceptionSegment = buildMatchAny({
          item: {
            operator: 'excluded',
            field: 'host.name',
            value: ['suricata', 'auditd'],
            type: 'match_any',
          },
          language: 'lucene',
        });

        expect(exceptionSegment).toEqual('host.name:(suricata OR auditd)');
      });

      test('it returns formatted string when "values" includes only one item', () => {
        const exceptionSegment = buildMatchAny({
          item: {
            operator: 'included',
            field: 'host.name',
            value: ['suricata'],
            type: 'match_any',
          },
          language: 'lucene',
        });

        expect(exceptionSegment).toEqual('NOT host.name:(suricata)');
      });
    });
  });

  describe('buildNested', () => {
    describe('kuery', () => {
      test('it returns formatted query when one item in nested entry', () => {
        const item: EntryNested = {
          field: 'parent',
          type: 'nested',
          entries: [
            {
              field: 'nestedField',
              operator: 'excluded',
              type: 'match',
              value: 'value-3',
            },
          ],
        };
        const result = buildNested({ item, language: 'kuery' });

        expect(result).toEqual('parent:{ nestedField:value-3 }');
      });

      test('it returns formatted query when multiple items in nested entry', () => {
        const item: EntryNested = {
          field: 'parent',
          type: 'nested',
          entries: [
            {
              field: 'nestedField',
              operator: 'excluded',
              type: 'match',
              value: 'value-3',
            },
            {
              field: 'nestedFieldB',
              operator: 'excluded',
              type: 'match',
              value: 'value-4',
            },
          ],
        };
        const result = buildNested({ item, language: 'kuery' });

        expect(result).toEqual('parent:{ nestedField:value-3 and nestedFieldB:value-4 }');
      });
    });

    // TODO: Does lucene support nested query syntax?
    describe.skip('lucene', () => {
      test('it returns formatted query when one item in nested entry', () => {
        const item: EntryNested = {
          field: 'parent',
          type: 'nested',
          entries: [
            {
              field: 'nestedField',
              operator: 'excluded',
              type: 'match',
              value: 'value-3',
            },
          ],
        };
        const result = buildNested({ item, language: 'lucene' });

        expect(result).toEqual('parent:{ nestedField:value-3 }');
      });

      test('it returns formatted query when multiple items in nested entry', () => {
        const item: EntryNested = {
          field: 'parent',
          type: 'nested',
          entries: [
            {
              field: 'nestedField',
              operator: 'excluded',
              type: 'match',
              value: 'value-3',
            },
            {
              field: 'nestedFieldB',
              operator: 'excluded',
              type: 'match',
              value: 'value-4',
            },
          ],
        };
        const result = buildNested({ item, language: 'lucene' });

        expect(result).toEqual('parent:{ nestedField:value-3 AND nestedFieldB:value-4 }');
      });
    });
  });

  describe('evaluateValues', () => {
    describe('kuery', () => {
      test('it returns formatted wildcard string when "type" is "exists"', () => {
        const list: EntryExists = {
          operator: 'included',
          type: 'exists',
          field: 'host.name',
        };
        const result = evaluateValues({
          item: list,
          language: 'kuery',
        });

        expect(result).toEqual('not host.name:*');
      });

      test('it returns formatted string when "type" is "match"', () => {
        const list: EntryMatch = {
          operator: 'included',
          type: 'match',
          field: 'host.name',
          value: 'suricata',
        };
        const result = evaluateValues({
          item: list,
          language: 'kuery',
        });

        expect(result).toEqual('not host.name:suricata');
      });

      test('it returns formatted string when "type" is "match_any"', () => {
        const list: EntryMatchAny = {
          operator: 'included',
          type: 'match_any',
          field: 'host.name',
          value: ['suricata', 'auditd'],
        };

        const result = evaluateValues({
          item: list,
          language: 'kuery',
        });

        expect(result).toEqual('not host.name:(suricata or auditd)');
      });
    });

    describe('lucene', () => {
      describe('kuery', () => {
        test('it returns formatted wildcard string when "type" is "exists"', () => {
          const list: EntryExists = {
            operator: 'included',
            type: 'exists',
            field: 'host.name',
          };
          const result = evaluateValues({
            item: list,
            language: 'lucene',
          });

          expect(result).toEqual('NOT _exists_host.name');
        });

        test('it returns formatted string when "type" is "match"', () => {
          const list: EntryMatch = {
            operator: 'included',
            type: 'match',
            field: 'host.name',
            value: 'suricata',
          };
          const result = evaluateValues({
            item: list,
            language: 'lucene',
          });

          expect(result).toEqual('NOT host.name:suricata');
        });

        test('it returns formatted string when "type" is "match_any"', () => {
          const list: EntryMatchAny = {
            operator: 'included',
            type: 'match_any',
            field: 'host.name',
            value: ['suricata', 'auditd'],
          };

          const result = evaluateValues({
            item: list,
            language: 'lucene',
          });

          expect(result).toEqual('NOT host.name:(suricata OR auditd)');
        });
      });
    });
  });

  describe('formatQuery', () => {
    test('it returns query if "exceptions" is empty array', () => {
      const formattedQuery = formatQuery({ exceptions: [], query: 'a:*', language: 'kuery' });

      expect(formattedQuery).toEqual('a:*');
    });

    test('it returns expected query string when single exception in array', () => {
      const formattedQuery = formatQuery({
        exceptions: ['b:(value-1 or value-2) and not c:*'],
        query: 'a:*',
        language: 'kuery',
      });

      expect(formattedQuery).toEqual('(a:* and b:(value-1 or value-2) and not c:*)');
    });

    test('it returns expected query string when multiple exceptions in array', () => {
      const formattedQuery = formatQuery({
        exceptions: ['b:(value-1 or value-2) and not c:*', 'not d:*'],
        query: 'a:*',
        language: 'kuery',
      });

      expect(formattedQuery).toEqual(
        '(a:* and b:(value-1 or value-2) and not c:*) or (a:* and not d:*)'
      );
    });
  });

  describe('buildExceptionItemEntries', () => {
    test('it returns empty string if empty lists array passed in', () => {
      const query = buildExceptionItemEntries({
        language: 'kuery',
        lists: [],
      });

      expect(query).toEqual('');
    });

    test('it returns expected query when more than one item in list', () => {
      // Equal to query && !(b && !c) -> (query AND NOT b) OR (query AND c)
      // https://www.dcode.fr/boolean-expressions-calculator
      const payload: EntriesArray = [
        {
          field: 'b',
          operator: 'included',
          type: 'match_any',
          value: ['value-1', 'value-2'],
        },
        {
          field: 'c',
          operator: 'excluded',
          type: 'match',
          value: 'value-3',
        },
      ];
      const query = buildExceptionItemEntries({
        language: 'kuery',
        lists: payload,
      });
      const expectedQuery = 'not b:(value-1 or value-2) and c:value-3';

      expect(query).toEqual(expectedQuery);
    });

    test('it returns expected query when list item includes nested value', () => {
      // Equal to query && !(b || !c) -> (query AND NOT b AND c)
      // https://www.dcode.fr/boolean-expressions-calculator
      const lists: EntriesArray = [
        {
          field: 'b',
          operator: 'included',
          type: 'match_any',
          value: ['value-1', 'value-2'],
        },
        {
          field: 'parent',
          type: 'nested',
          entries: [
            {
              field: 'nestedField',
              operator: 'excluded',
              type: 'match',
              value: 'value-3',
            },
          ],
        },
      ];
      const query = buildExceptionItemEntries({
        language: 'kuery',
        lists,
      });
      const expectedQuery = 'not b:(value-1 or value-2) and parent:{ nestedField:value-3 }';

      expect(query).toEqual(expectedQuery);
    });

    test('it returns expected query when list includes multiple items and nested "and" values', () => {
      // Equal to query && !((b || !c) && d) -> (query AND NOT b AND c) OR (query AND NOT d)
      // https://www.dcode.fr/boolean-expressions-calculator
      const lists: EntriesArray = [
        {
          field: 'b',
          operator: 'included',
          type: 'match_any',
          value: ['value-1', 'value-2'],
        },
        {
          field: 'parent',
          type: 'nested',
          entries: [
            {
              field: 'nestedField',
              operator: 'excluded',
              type: 'match',
              value: 'value-3',
            },
          ],
        },
        {
          field: 'd',
          operator: 'included',
          type: 'exists',
        },
      ];
      const query = buildExceptionItemEntries({
        language: 'kuery',
        lists,
      });
      const expectedQuery =
        'not b:(value-1 or value-2) and parent:{ nestedField:value-3 } and not d:*';
      expect(query).toEqual(expectedQuery);
    });

    test('it returns expected query when language is "lucene"', () => {
      // Equal to query && !((b || !c) && !d) -> (query AND NOT b AND c) OR (query AND d)
      // https://www.dcode.fr/boolean-expressions-calculator
      const lists: EntriesArray = [
        {
          field: 'b',
          operator: 'included',
          type: 'match_any',
          value: ['value-1', 'value-2'],
        },
        {
          field: 'parent',
          type: 'nested',
          entries: [
            {
              field: 'nestedField',
              operator: 'excluded',
              type: 'match',
              value: 'value-3',
            },
          ],
        },
        {
          field: 'e',
          operator: 'excluded',
          type: 'exists',
        },
      ];
      const query = buildExceptionItemEntries({
        language: 'lucene',
        lists,
      });
      const expectedQuery =
        'NOT b:(value-1 OR value-2) AND parent:{ nestedField:value-3 } AND _exists_e';
      expect(query).toEqual(expectedQuery);
    });

    describe('exists', () => {
      test('it returns expected query when list includes single list item with operator of "included"', () => {
        // Equal to query && !(b) -> (query AND NOT b)
        // https://www.dcode.fr/boolean-expressions-calculator
        const lists: EntriesArray = [
          {
            field: 'b',
            operator: 'included',
            type: 'exists',
          },
        ];
        const query = buildExceptionItemEntries({
          language: 'kuery',
          lists,
        });
        const expectedQuery = 'not b:*';

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes single list item with operator of "excluded"', () => {
        // Equal to query && !(!b) -> (query AND b)
        // https://www.dcode.fr/boolean-expressions-calculator
        const lists: EntriesArray = [
          {
            field: 'b',
            operator: 'excluded',
            type: 'exists',
          },
        ];
        const query = buildExceptionItemEntries({
          language: 'kuery',
          lists,
        });
        const expectedQuery = 'b:*';

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes list item with "and" values', () => {
        // Equal to query && !(!b || !c) -> (query AND b AND c)
        // https://www.dcode.fr/boolean-expressions-calculator
        const lists: EntriesArray = [
          {
            field: 'b',
            operator: 'excluded',
            type: 'exists',
          },
          {
            field: 'parent',
            type: 'nested',
            entries: [
              {
                field: 'c',
                operator: 'excluded',
                type: 'match',
                value: 'value-1',
              },
            ],
          },
        ];
        const query = buildExceptionItemEntries({
          language: 'kuery',
          lists,
        });
        const expectedQuery = 'b:* and parent:{ c:value-1 }';

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes multiple items', () => {
        // Equal to query && !((b || !c || d) && e) -> (query AND NOT b AND c AND NOT d) OR (query AND NOT e)
        // https://www.dcode.fr/boolean-expressions-calculator
        const lists: EntriesArray = [
          {
            field: 'b',
            operator: 'included',
            type: 'exists',
          },
          {
            field: 'parent',
            type: 'nested',
            entries: [
              {
                field: 'c',
                operator: 'excluded',
                type: 'match',
                value: 'value-1',
              },
              {
                field: 'd',
                operator: 'included',
                type: 'match',
                value: 'value-2',
              },
            ],
          },
          {
            field: 'e',
            operator: 'included',
            type: 'exists',
          },
        ];
        const query = buildExceptionItemEntries({
          language: 'kuery',
          lists,
        });
        const expectedQuery = 'not b:* and parent:{ c:value-1 and d:value-2 } and not e:*';

        expect(query).toEqual(expectedQuery);
      });
    });

    describe('match', () => {
      test('it returns expected query when list includes single list item with operator of "included"', () => {
        // Equal to query && !(b) -> (query AND NOT b)
        // https://www.dcode.fr/boolean-expressions-calculator
        const lists: EntriesArray = [
          {
            field: 'b',
            operator: 'included',
            type: 'match',
            value: 'value',
          },
        ];
        const query = buildExceptionItemEntries({
          language: 'kuery',
          lists,
        });
        const expectedQuery = 'not b:value';

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes single list item with operator of "excluded"', () => {
        // Equal to query && !(!b) -> (query AND b)
        // https://www.dcode.fr/boolean-expressions-calculator
        const lists: EntriesArray = [
          {
            field: 'b',
            operator: 'excluded',
            type: 'match',
            value: 'value',
          },
        ];
        const query = buildExceptionItemEntries({
          language: 'kuery',
          lists,
        });
        const expectedQuery = 'b:value';

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes list item with "and" values', () => {
        // Equal to query && !(!b || !c) -> (query AND b AND c)
        // https://www.dcode.fr/boolean-expressions-calculator
        const lists: EntriesArray = [
          {
            field: 'b',
            operator: 'excluded',
            type: 'match',
            value: 'value',
          },
          {
            field: 'parent',
            type: 'nested',
            entries: [
              {
                field: 'c',
                operator: 'excluded',
                type: 'match',
                value: 'valueC',
              },
            ],
          },
        ];
        const query = buildExceptionItemEntries({
          language: 'kuery',
          lists,
        });
        const expectedQuery = 'b:value and parent:{ c:valueC }';

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes multiple items', () => {
        // Equal to query && !((b || !c || d) && e) -> (query AND NOT b AND c AND NOT d) OR (query AND NOT e)
        // https://www.dcode.fr/boolean-expressions-calculator
        const lists: EntriesArray = [
          {
            field: 'b',
            operator: 'included',
            type: 'match',
            value: 'value',
          },
          {
            field: 'parent',
            type: 'nested',
            entries: [
              {
                field: 'c',
                operator: 'excluded',
                type: 'match',
                value: 'valueC',
              },
              {
                field: 'd',
                operator: 'excluded',
                type: 'match',
                value: 'valueC',
              },
            ],
          },
          {
            field: 'e',
            operator: 'included',
            type: 'match',
            value: 'valueC',
          },
        ];
        const query = buildExceptionItemEntries({
          language: 'kuery',
          lists,
        });
        const expectedQuery = 'not b:value and parent:{ c:valueC and d:valueC } and not e:valueC';

        expect(query).toEqual(expectedQuery);
      });
    });

    describe('match_any', () => {
      test('it returns expected query when list includes single list item with operator of "included"', () => {
        // Equal to query && !(b) -> (query AND NOT b)
        // https://www.dcode.fr/boolean-expressions-calculator
        const lists: EntriesArray = [
          {
            field: 'b',
            operator: 'included',
            type: 'match_any',
            value: ['value', 'value-1'],
          },
        ];
        const query = buildExceptionItemEntries({
          language: 'kuery',
          lists,
        });
        const expectedQuery = 'not b:(value or value-1)';

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes single list item with operator of "excluded"', () => {
        // Equal to query && !(!b) -> (query AND b)
        // https://www.dcode.fr/boolean-expressions-calculator
        const lists: EntriesArray = [
          {
            field: 'b',
            operator: 'excluded',
            type: 'match_any',
            value: ['value', 'value-1'],
          },
        ];
        const query = buildExceptionItemEntries({
          language: 'kuery',
          lists,
        });
        const expectedQuery = 'b:(value or value-1)';

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes list item with nested values', () => {
        // Equal to query && !(!b || c) -> (query AND b AND NOT c)
        // https://www.dcode.fr/boolean-expressions-calculator
        const lists: EntriesArray = [
          {
            field: 'b',
            operator: 'excluded',
            type: 'match_any',
            value: ['value', 'value-1'],
          },
          {
            field: 'parent',
            type: 'nested',
            entries: [
              {
                field: 'c',
                operator: 'excluded',
                type: 'match',
                value: 'valueC',
              },
            ],
          },
        ];
        const query = buildExceptionItemEntries({
          language: 'kuery',
          lists,
        });
        const expectedQuery = 'b:(value or value-1) and parent:{ c:valueC }';

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes multiple items', () => {
        // Equal to query && !((b || !c || d) && e) -> ((query AND NOT b AND c AND NOT d) OR (query AND NOT e)
        // https://www.dcode.fr/boolean-expressions-calculator
        const lists: EntriesArray = [
          {
            field: 'b',
            operator: 'included',
            type: 'match_any',
            value: ['value', 'value-1'],
          },
          {
            field: 'e',
            operator: 'included',
            type: 'match_any',
            value: ['valueE', 'value-4'],
          },
        ];
        const query = buildExceptionItemEntries({
          language: 'kuery',
          lists,
        });
        const expectedQuery = 'not b:(value or value-1) and not e:(valueE or value-4)';

        expect(query).toEqual(expectedQuery);
      });
    });
  });

  describe('buildQueryExceptions', () => {
    test('it returns original query if lists is empty array', () => {
      const query = buildQueryExceptions({ query: 'host.name: *', language: 'kuery', lists: [] });
      const expectedQuery = 'host.name: *';

      expect(query).toEqual([{ query: expectedQuery, language: 'kuery' }]);
    });

    test('it returns expected query when lists exist and language is "kuery"', () => {
      // Equal to query && !((b || !c || d) && e) -> ((query AND NOT b AND c AND NOT d) OR (query AND NOT e)
      // https://www.dcode.fr/boolean-expressions-calculator
      const payload = getExceptionListItemSchemaMock();
      const payload2 = getExceptionListItemSchemaMock();
      payload2.entries = [
        {
          field: 'b',
          operator: 'included',
          type: 'match_any',
          value: ['value', 'value-1'],
        },
        {
          field: 'parent',
          type: 'nested',
          entries: [
            {
              field: 'c',
              operator: 'excluded',
              type: 'match',
              value: 'valueC',
            },
            {
              field: 'd',
              operator: 'excluded',
              type: 'match',
              value: 'valueD',
            },
          ],
        },
        {
          field: 'e',
          operator: 'included',
          type: 'match_any',
          value: ['valueE', 'value-4'],
        },
      ];
      const query = buildQueryExceptions({
        query: 'a:*',
        language: 'kuery',
        lists: [payload, payload2],
      });
      const expectedQuery =
        '(a:* and some.parentField:{ nested.field:some value } and not some.not.nested.field:some value) or (a:* and not b:(value or value-1) and parent:{ c:valueC and d:valueD } and not e:(valueE or value-4))';

      expect(query).toEqual([{ query: expectedQuery, language: 'kuery' }]);
    });

    test('it returns expected query when lists exist and language is "lucene"', () => {
      // Equal to query && !((b || !c || d) && e) -> ((query AND NOT b AND c AND NOT d) OR (query AND NOT e)
      // https://www.dcode.fr/boolean-expressions-calculator
      const payload = getExceptionListItemSchemaMock();
      const payload2 = getExceptionListItemSchemaMock();
      payload2.entries = [
        {
          field: 'b',
          operator: 'included',
          type: 'match_any',
          value: ['value', 'value-1'],
        },
        {
          field: 'parent',
          type: 'nested',
          entries: [
            {
              field: 'c',
              operator: 'excluded',
              type: 'match',
              value: 'valueC',
            },
            {
              field: 'd',
              operator: 'excluded',
              type: 'match',
              value: 'valueD',
            },
          ],
        },
        {
          field: 'e',
          operator: 'included',
          type: 'match_any',
          value: ['valueE', 'value-4'],
        },
      ];
      const query = buildQueryExceptions({
        query: 'a:*',
        language: 'lucene',
        lists: [payload, payload2],
      });
      const expectedQuery =
        '(a:* AND some.parentField:{ nested.field:some value } AND NOT some.not.nested.field:some value) OR (a:* AND NOT b:(value OR value-1) AND parent:{ c:valueC AND d:valueD } AND NOT e:(valueE OR value-4))';

      expect(query).toEqual([{ query: expectedQuery, language: 'lucene' }]);
    });
  });
});
