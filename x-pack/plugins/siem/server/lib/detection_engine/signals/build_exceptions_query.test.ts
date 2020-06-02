/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  buildQueryExceptions,
  buildExceptions,
  operatorBuilder,
  buildExists,
  buildMatch,
  buildMatchAll,
  evaluateValues,
  formatQuery,
  getLanguageBooleanOperator,
} from './build_exceptions_query';
import { List } from '../../../../common/detection_engine/schemas/types/lists_default_array';

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
      test('it returns "not " when operator is "excluded"', () => {
        const operator = operatorBuilder({ operator: 'excluded', language: 'kuery' });

        expect(operator).toEqual(' and ');
      });

      test('it returns empty string when operator is "included"', () => {
        const operator = operatorBuilder({ operator: 'included', language: 'kuery' });

        expect(operator).toEqual(' and not ');
      });
    });

    describe('lucene', () => {
      test('it returns "NOT " when operator is "excluded"', () => {
        const operator = operatorBuilder({ operator: 'excluded', language: 'lucene' });

        expect(operator).toEqual(' AND ');
      });

      test('it returns empty string when operator is "included"', () => {
        const operator = operatorBuilder({ operator: 'included', language: 'lucene' });

        expect(operator).toEqual(' AND NOT ');
      });
    });
  });

  describe('buildExists', () => {
    describe('kuery', () => {
      test('it returns formatted wildcard string when operator is "excluded"', () => {
        const query = buildExists({ operator: 'excluded', field: 'host.name', language: 'kuery' });

        expect(query).toEqual(' and host.name:*');
      });

      test('it returns formatted wildcard string when operator is "included"', () => {
        const query = buildExists({ operator: 'included', field: 'host.name', language: 'kuery' });

        expect(query).toEqual(' and not host.name:*');
      });
    });

    describe('lucene', () => {
      test('it returns formatted wildcard string when operator is "excluded"', () => {
        const query = buildExists({ operator: 'excluded', field: 'host.name', language: 'lucene' });

        expect(query).toEqual(' AND _exists_host.name');
      });

      test('it returns formatted wildcard string when operator is "included"', () => {
        const query = buildExists({ operator: 'included', field: 'host.name', language: 'lucene' });

        expect(query).toEqual(' AND NOT _exists_host.name');
      });
    });
  });

  describe('buildMatch', () => {
    describe('kuery', () => {
      test('it returns empty string if no items in "values"', () => {
        const query = buildMatch({
          operator: 'included',
          field: 'host.name',
          values: [],
          language: 'kuery',
        });

        expect(query).toEqual('');
      });

      test('it returns formatted string when operator is "included"', () => {
        const values = [
          {
            name: 'suricata',
          },
        ];
        const query = buildMatch({
          operator: 'included',
          field: 'host.name',
          values,
          language: 'kuery',
        });

        expect(query).toEqual(' and not host.name:suricata');
      });

      test('it returns formatted string when operator is "excluded"', () => {
        const values = [
          {
            name: 'suricata',
          },
        ];
        const query = buildMatch({
          operator: 'excluded',
          field: 'host.name',
          values,
          language: 'kuery',
        });

        expect(query).toEqual(' and host.name:suricata');
      });

      // TODO: need to clean up types and maybe restrict values to one if type is 'match'
      test('it returns formatted string when "values" includes more than one item', () => {
        const values = [
          {
            name: 'suricata',
          },
          {
            name: 'auditd',
          },
        ];
        const query = buildMatch({
          operator: 'included',
          field: 'host.name',
          values,
          language: 'kuery',
        });

        expect(query).toEqual(' and not host.name:suricata');
      });
    });

    describe('lucene', () => {
      test('it returns formatted string when operator is "included"', () => {
        const values = [
          {
            name: 'suricata',
          },
        ];
        const query = buildMatch({
          operator: 'included',
          field: 'host.name',
          values,
          language: 'lucene',
        });

        expect(query).toEqual(' AND NOT host.name:suricata');
      });

      test('it returns formatted string when operator is "excluded"', () => {
        const values = [
          {
            name: 'suricata',
          },
        ];
        const query = buildMatch({
          operator: 'excluded',
          field: 'host.name',
          values,
          language: 'lucene',
        });

        expect(query).toEqual(' AND host.name:suricata');
      });

      // TODO: need to clean up types and maybe restrict values to one if type is 'match'
      test('it returns formatted string when "values" includes more than one item', () => {
        const values = [
          {
            name: 'suricata',
          },
          {
            name: 'auditd',
          },
        ];
        const query = buildMatch({
          operator: 'included',
          field: 'host.name',
          values,
          language: 'lucene',
        });

        expect(query).toEqual(' AND NOT host.name:suricata');
      });
    });
  });

  describe('buildMatchAll', () => {
    describe('kuery', () => {
      test('it returns empty string if given an empty array for "values"', () => {
        const exceptionSegment = buildMatchAll({
          operator: 'included',
          field: 'host.name',
          values: [],
          language: 'kuery',
        });

        expect(exceptionSegment).toEqual('');
      });

      test('it returns formatted string when "values" includes only one item', () => {
        const values = [
          {
            name: 'suricata',
          },
        ];
        const exceptionSegment = buildMatchAll({
          operator: 'included',
          field: 'host.name',
          values,
          language: 'kuery',
        });

        expect(exceptionSegment).toEqual(' and not host.name:suricata');
      });

      test('it returns formatted string when operator is "included"', () => {
        const values = [
          {
            name: 'suricata',
          },
          {
            name: 'auditd',
          },
        ];
        const exceptionSegment = buildMatchAll({
          operator: 'included',
          field: 'host.name',
          values,
          language: 'kuery',
        });

        expect(exceptionSegment).toEqual(' and not host.name:(suricata or auditd)');
      });

      test('it returns formatted string when operator is "excluded"', () => {
        const values = [
          {
            name: 'suricata',
          },
          {
            name: 'auditd',
          },
        ];
        const exceptionSegment = buildMatchAll({
          operator: 'excluded',
          field: 'host.name',
          values,
          language: 'kuery',
        });

        expect(exceptionSegment).toEqual(' and host.name:(suricata or auditd)');
      });
    });

    describe('lucene', () => {
      test('it returns formatted string when operator is "included"', () => {
        const values = [
          {
            name: 'suricata',
          },
          {
            name: 'auditd',
          },
        ];
        const exceptionSegment = buildMatchAll({
          operator: 'included',
          field: 'host.name',
          values,
          language: 'lucene',
        });

        expect(exceptionSegment).toEqual(' AND NOT host.name:(suricata OR auditd)');
      });

      test('it returns formatted string when operator is "excluded"', () => {
        const values = [
          {
            name: 'suricata',
          },
          {
            name: 'auditd',
          },
        ];
        const exceptionSegment = buildMatchAll({
          operator: 'excluded',
          field: 'host.name',
          values,
          language: 'lucene',
        });

        expect(exceptionSegment).toEqual(' AND host.name:(suricata OR auditd)');
      });

      test('it returns formatted string when "values" includes only one item', () => {
        const values = [
          {
            name: 'suricata',
          },
        ];
        const exceptionSegment = buildMatchAll({
          operator: 'included',
          field: 'host.name',
          values,
          language: 'lucene',
        });

        expect(exceptionSegment).toEqual(' AND NOT host.name:suricata');
      });
    });
  });

  describe('evaluateValues', () => {
    describe('kuery', () => {
      test('it returns formatted wildcard string when "type" is "exists"', () => {
        const list: List = {
          values_operator: 'included',
          values_type: 'exists',
          field: 'host.name',
        };
        const result = evaluateValues({
          list,
          language: 'kuery',
        });

        expect(result).toEqual(' and not host.name:*');
      });

      test('it returns formatted string when "type" is "match"', () => {
        const list: List = {
          values_operator: 'included',
          values_type: 'match',
          field: 'host.name',
          values: [{ name: 'suricata' }],
        };
        const result = evaluateValues({
          list,
          language: 'kuery',
        });

        expect(result).toEqual(' and not host.name:suricata');
      });

      test('it returns formatted string when "type" is "match_all"', () => {
        const list: List = {
          values_operator: 'included',
          values_type: 'match_all',
          field: 'host.name',
          values: [
            {
              name: 'suricata',
            },
            {
              name: 'auditd',
            },
          ],
        };

        const result = evaluateValues({
          list,
          language: 'kuery',
        });

        expect(result).toEqual(' and not host.name:(suricata or auditd)');
      });
    });

    describe('lucene', () => {
      describe('kuery', () => {
        test('it returns formatted wildcard string when "type" is "exists"', () => {
          const list: List = {
            values_operator: 'included',
            values_type: 'exists',
            field: 'host.name',
          };
          const result = evaluateValues({
            list,
            language: 'lucene',
          });

          expect(result).toEqual(' AND NOT _exists_host.name');
        });

        test('it returns formatted string when "type" is "match"', () => {
          const list: List = {
            values_operator: 'included',
            values_type: 'match',
            field: 'host.name',
            values: [{ name: 'suricata' }],
          };
          const result = evaluateValues({
            list,
            language: 'lucene',
          });

          expect(result).toEqual(' AND NOT host.name:suricata');
        });

        test('it returns formatted string when "type" is "match_all"', () => {
          const list: List = {
            values_operator: 'included',
            values_type: 'match_all',
            field: 'host.name',
            values: [
              {
                name: 'suricata',
              },
              {
                name: 'auditd',
              },
            ],
          };

          const result = evaluateValues({
            list,
            language: 'lucene',
          });

          expect(result).toEqual(' AND NOT host.name:(suricata OR auditd)');
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
        exceptions: [' and b:(value-1 or value-2) and not c:*'],
        query: 'a:*',
        language: 'kuery',
      });

      expect(formattedQuery).toEqual('(a:* and b:(value-1 or value-2) and not c:*)');
    });

    test('it returns expected query string when multiple exceptions in array', () => {
      const formattedQuery = formatQuery({
        exceptions: [' and b:(value-1 or value-2) and not c:*', ' and not d:*'],
        query: 'a:*',
        language: 'kuery',
      });

      expect(formattedQuery).toEqual(
        '(a:* and b:(value-1 or value-2) and not c:*) or (a:* and not d:*)'
      );
    });
  });

  describe('buildExceptions', () => {
    test('it returns empty array if empty lists array passed in', () => {
      const query = buildExceptions({
        query: 'a:*',
        language: 'kuery',
        lists: [],
      });

      expect(query).toEqual([]);
    });

    test('it returns expected query when more than one item in list', () => {
      // Equal to query && !(b && !c) -> (query AND NOT b) OR (query AND c)
      // https://www.dcode.fr/boolean-expressions-calculator
      const lists: List[] = [
        {
          field: 'b',
          values_operator: 'included',
          values_type: 'match_all',
          values: [
            {
              name: 'value-1',
            },
            {
              name: 'value-2',
            },
          ],
        },
        {
          field: 'c',
          values_operator: 'excluded',
          values_type: 'match',
          values: [
            {
              name: 'value-3',
            },
          ],
        },
      ];
      const query = buildExceptions({
        query: 'a:*',
        language: 'kuery',
        lists,
      });
      const expectedQuery = [' and not b:(value-1 or value-2)', ' and c:value-3'];

      expect(query).toEqual(expectedQuery);
    });

    test('it returns expected query when list item includes nested "and" value', () => {
      // Equal to query && !(b || !c) -> (query AND NOT b AND c)
      // https://www.dcode.fr/boolean-expressions-calculator
      const lists: List[] = [
        {
          field: 'b',
          values_operator: 'included',
          values_type: 'match_all',
          values: [
            {
              name: 'value-1',
            },
            {
              name: 'value-2',
            },
          ],
          and: [
            {
              field: 'c',
              values_operator: 'excluded',
              values_type: 'match',
              values: [
                {
                  name: 'value-3',
                },
              ],
            },
          ],
        },
      ];
      const query = buildExceptions({
        query: 'a:*',
        language: 'kuery',
        lists,
      });
      const expectedQuery = [' and not b:(value-1 or value-2) and c:value-3'];

      expect(query).toEqual(expectedQuery);
    });

    test('it returns expected query when list item includes nested "and" value of empty array', () => {
      // Equal to query && !(b || !c) -> (query AND NOT b AND c)
      // https://www.dcode.fr/boolean-expressions-calculator
      const lists: List[] = [
        {
          field: 'b',
          values_operator: 'included',
          values_type: 'match_all',
          values: [
            {
              name: 'value-1',
            },
            {
              name: 'value-2',
            },
          ],
          and: [],
        },
      ];
      const query = buildExceptions({
        query: 'a:*',
        language: 'kuery',
        lists,
      });
      const expectedQuery = [' and not b:(value-1 or value-2)'];

      expect(query).toEqual(expectedQuery);
    });

    test('it returns expected query when list item includes nested "and" value of null', () => {
      // Equal to query && !(b || !c) -> (query AND NOT b AND c)
      // https://www.dcode.fr/boolean-expressions-calculator
      const lists: List[] = [
        {
          field: 'b',
          values_operator: 'included',
          values_type: 'match_all',
          values: [
            {
              name: 'value-1',
            },
            {
              name: 'value-2',
            },
          ],
          and: undefined,
        },
      ];
      const query = buildExceptions({
        query: 'a:*',
        language: 'kuery',
        lists,
      });
      const expectedQuery = [' and not b:(value-1 or value-2)'];

      expect(query).toEqual(expectedQuery);
    });

    test('it returns expected query when list includes multiple items and nested "and" values', () => {
      // Equal to query && !((b || !c) && d) -> (query AND NOT b AND c) OR (query AND NOT d)
      // https://www.dcode.fr/boolean-expressions-calculator
      const lists: List[] = [
        {
          field: 'b',
          values_operator: 'included',
          values_type: 'match_all',
          values: [
            {
              name: 'value-1',
            },
            {
              name: 'value-2',
            },
          ],
          and: [
            {
              field: 'c',
              values_operator: 'excluded',
              values_type: 'match',
              values: [
                {
                  name: 'value-3',
                },
              ],
            },
          ],
        },
        {
          field: 'd',
          values_operator: 'included',
          values_type: 'exists',
        },
      ];
      const query = buildExceptions({
        query: 'a:*',
        language: 'kuery',
        lists,
      });
      const expectedQuery = [' and not b:(value-1 or value-2) and c:value-3', ' and not d:*'];

      expect(query).toEqual(expectedQuery);
    });

    test('it returns expected query when language is "lucene"', () => {
      // Equal to query && !((b || !c) && !d) -> (query AND NOT b AND c) OR (query AND d)
      // https://www.dcode.fr/boolean-expressions-calculator
      const lists: List[] = [
        {
          field: 'b',
          values_operator: 'included',
          values_type: 'match_all',
          values: [
            {
              name: 'value-1',
            },
            {
              name: 'value-2',
            },
          ],
          and: [
            {
              field: 'c',
              values_operator: 'excluded',
              values_type: 'match',
              values: [
                {
                  name: 'value-3',
                },
              ],
            },
          ],
        },
        {
          field: 'e',
          values_operator: 'excluded',
          values_type: 'exists',
        },
      ];
      const query = buildExceptions({
        query: 'a:*',
        language: 'lucene',
        lists,
      });
      const expectedQuery = [' AND NOT b:(value-1 OR value-2) AND c:value-3', ' AND _exists_e'];

      expect(query).toEqual(expectedQuery);
    });

    describe('exists', () => {
      test('it returns expected query when list includes single list item with values_operator of "included"', () => {
        // Equal to query && !(b) -> (query AND NOT b)
        // https://www.dcode.fr/boolean-expressions-calculator
        const lists: List[] = [
          {
            field: 'b',
            values_operator: 'included',
            values_type: 'exists',
          },
        ];
        const query = buildExceptions({
          query: 'a:*',
          language: 'kuery',
          lists,
        });
        const expectedQuery = [' and not b:*'];

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes single list item with values_operator of "excluded"', () => {
        // Equal to query && !(!b) -> (query AND b)
        // https://www.dcode.fr/boolean-expressions-calculator
        const lists: List[] = [
          {
            field: 'b',
            values_operator: 'excluded',
            values_type: 'exists',
          },
        ];
        const query = buildExceptions({
          query: 'a:*',
          language: 'kuery',
          lists,
        });
        const expectedQuery = [' and b:*'];

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes list item with "and" values', () => {
        // Equal to query && !(!b || !c) -> (query AND b AND c)
        // https://www.dcode.fr/boolean-expressions-calculator
        const lists: List[] = [
          {
            field: 'b',
            values_operator: 'excluded',
            values_type: 'exists',
            and: [
              {
                field: 'c',
                values_operator: 'excluded',
                values_type: 'exists',
              },
            ],
          },
        ];
        const query = buildExceptions({
          query: 'a:*',
          language: 'kuery',
          lists,
        });
        const expectedQuery = [' and b:* and c:*'];

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes multiple items', () => {
        // Equal to query && !((b || !c || d) && e) -> (query AND NOT b AND c AND NOT d) OR (query AND NOT e)
        // https://www.dcode.fr/boolean-expressions-calculator
        const lists: List[] = [
          {
            field: 'b',
            values_operator: 'included',
            values_type: 'exists',
            and: [
              {
                field: 'c',
                values_operator: 'excluded',
                values_type: 'exists',
              },
              {
                field: 'd',
                values_operator: 'included',
                values_type: 'exists',
              },
            ],
          },
          {
            field: 'e',
            values_operator: 'included',
            values_type: 'exists',
          },
        ];
        const query = buildExceptions({
          query: 'a:*',
          language: 'kuery',
          lists,
        });
        const expectedQuery = [' and not b:* and c:* and not d:*', ' and not e:*'];

        expect(query).toEqual(expectedQuery);
      });
    });

    describe('match', () => {
      test('it returns expected query when list includes single list item with values_operator of "included"', () => {
        // Equal to query && !(b) -> (query AND NOT b)
        // https://www.dcode.fr/boolean-expressions-calculator
        const lists: List[] = [
          {
            field: 'b',
            values_operator: 'included',
            values_type: 'match',
            values: [
              {
                name: 'value',
              },
            ],
          },
        ];
        const query = buildExceptions({
          query: 'a:*',
          language: 'kuery',
          lists,
        });
        const expectedQuery = [' and not b:value'];

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes single list item with values_operator of "excluded"', () => {
        // Equal to query && !(!b) -> (query AND b)
        // https://www.dcode.fr/boolean-expressions-calculator
        const lists: List[] = [
          {
            field: 'b',
            values_operator: 'excluded',
            values_type: 'match',
            values: [
              {
                name: 'value',
              },
            ],
          },
        ];
        const query = buildExceptions({
          query: 'a:*',
          language: 'kuery',
          lists,
        });
        const expectedQuery = [' and b:value'];

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes list item with "and" values', () => {
        // Equal to query && !(!b || !c) -> (query AND b AND c)
        // https://www.dcode.fr/boolean-expressions-calculator
        const lists: List[] = [
          {
            field: 'b',
            values_operator: 'excluded',
            values_type: 'match',
            values: [
              {
                name: 'value',
              },
            ],
            and: [
              {
                field: 'c',
                values_operator: 'excluded',
                values_type: 'match',
                values: [
                  {
                    name: 'valueC',
                  },
                ],
              },
            ],
          },
        ];
        const query = buildExceptions({
          query: 'a:*',
          language: 'kuery',
          lists,
        });
        const expectedQuery = [' and b:value and c:valueC'];

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes multiple items', () => {
        // Equal to query && !((b || !c || d) && e) -> (query AND NOT b AND c AND NOT d) OR (query AND NOT e)
        // https://www.dcode.fr/boolean-expressions-calculator
        const lists: List[] = [
          {
            field: 'b',
            values_operator: 'included',
            values_type: 'match',
            values: [
              {
                name: 'value',
              },
            ],
            and: [
              {
                field: 'c',
                values_operator: 'excluded',
                values_type: 'match',
                values: [
                  {
                    name: 'valueC',
                  },
                ],
              },
              {
                field: 'd',
                values_operator: 'included',
                values_type: 'match',
                values: [
                  {
                    name: 'valueC',
                  },
                ],
              },
            ],
          },
          {
            field: 'e',
            values_operator: 'included',
            values_type: 'match',
            values: [
              {
                name: 'valueC',
              },
            ],
          },
        ];
        const query = buildExceptions({
          query: 'a:*',
          language: 'kuery',
          lists,
        });
        const expectedQuery = [
          ' and not b:value and c:valueC and not d:valueC',
          ' and not e:valueC',
        ];

        expect(query).toEqual(expectedQuery);
      });
    });

    describe('match_all', () => {
      test('it returns expected query when list includes single list item with values_operator of "included"', () => {
        // Equal to query && !(b) -> (query AND NOT b)
        // https://www.dcode.fr/boolean-expressions-calculator
        const lists: List[] = [
          {
            field: 'b',
            values_operator: 'included',
            values_type: 'match_all',
            values: [
              {
                name: 'value',
              },
              {
                name: 'value-1',
              },
            ],
          },
        ];
        const query = buildExceptions({
          query: 'a:*',
          language: 'kuery',
          lists,
        });
        const expectedQuery = [' and not b:(value or value-1)'];

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes single list item with values_operator of "excluded"', () => {
        // Equal to query && !(!b) -> (query AND b)
        // https://www.dcode.fr/boolean-expressions-calculator
        const lists: List[] = [
          {
            field: 'b',
            values_operator: 'excluded',
            values_type: 'match_all',
            values: [
              {
                name: 'value',
              },
              {
                name: 'value-1',
              },
            ],
          },
        ];
        const query = buildExceptions({
          query: 'a:*',
          language: 'kuery',
          lists,
        });
        const expectedQuery = [' and b:(value or value-1)'];

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes list item with "and" values', () => {
        // Equal to query && !(!b || c) -> (query AND b AND NOT c)
        // https://www.dcode.fr/boolean-expressions-calculator
        const lists: List[] = [
          {
            field: 'b',
            values_operator: 'excluded',
            values_type: 'match_all',
            values: [
              {
                name: 'value',
              },
              {
                name: 'value-1',
              },
            ],
            and: [
              {
                field: 'c',
                values_operator: 'included',
                values_type: 'match_all',
                values: [
                  {
                    name: 'valueC',
                  },
                  {
                    name: 'value-2',
                  },
                ],
              },
            ],
          },
        ];
        const query = buildExceptions({
          query: 'a:*',
          language: 'kuery',
          lists,
        });
        const expectedQuery = [' and b:(value or value-1) and not c:(valueC or value-2)'];

        expect(query).toEqual(expectedQuery);
      });

      test('it returns expected query when list includes multiple items', () => {
        // Equal to query && !((b || !c || d) && e) -> ((query AND NOT b AND c AND NOT d) OR (query AND NOT e)
        // https://www.dcode.fr/boolean-expressions-calculator
        const lists: List[] = [
          {
            field: 'b',
            values_operator: 'included',
            values_type: 'match_all',
            values: [
              {
                name: 'value',
              },
              {
                name: 'value-1',
              },
            ],
            and: [
              {
                field: 'c',
                values_operator: 'excluded',
                values_type: 'match_all',
                values: [
                  {
                    name: 'valueC',
                  },
                  {
                    name: 'value-2',
                  },
                ],
              },
              {
                field: 'd',
                values_operator: 'included',
                values_type: 'match_all',
                values: [
                  {
                    name: 'valueD',
                  },
                  {
                    name: 'value-3',
                  },
                ],
              },
            ],
          },
          {
            field: 'e',
            values_operator: 'included',
            values_type: 'match_all',
            values: [
              {
                name: 'valueE',
              },
              {
                name: 'value-4',
              },
            ],
          },
        ];
        const query = buildExceptions({
          query: 'a:*',
          language: 'kuery',
          lists,
        });
        const expectedQuery = [
          ' and not b:(value or value-1) and c:(valueC or value-2) and not d:(valueD or value-3)',
          ' and not e:(valueE or value-4)',
        ];

        expect(query).toEqual(expectedQuery);
      });
    });
  });

  describe('buildQueryExceptions', () => {
    test('it returns original query if no lists exist', () => {
      const query = buildQueryExceptions({
        query: 'host.name: *',
        language: 'kuery',
        lists: undefined,
      });
      const expectedQuery = 'host.name: *';

      expect(query).toEqual([{ query: expectedQuery, language: 'kuery' }]);
    });

    test('it returns original query if lists is empty array', () => {
      const query = buildQueryExceptions({ query: 'host.name: *', language: 'kuery', lists: [] });
      const expectedQuery = 'host.name: *';

      expect(query).toEqual([{ query: expectedQuery, language: 'kuery' }]);
    });

    test('it returns original query if lists is null', () => {
      const query = buildQueryExceptions({ query: 'host.name: *', language: 'kuery', lists: null });
      const expectedQuery = 'host.name: *';

      expect(query).toEqual([{ query: expectedQuery, language: 'kuery' }]);
    });

    test('it returns original query if lists is undefined', () => {
      const query = buildQueryExceptions({
        query: 'host.name: *',
        language: 'kuery',
        lists: undefined,
      });
      const expectedQuery = 'host.name: *';

      expect(query).toEqual([{ query: expectedQuery, language: 'kuery' }]);
    });

    test('it returns expected query when lists exist and language is "kuery"', () => {
      // Equal to query && !((b || !c || d) && e) -> ((query AND NOT b AND c AND NOT d) OR (query AND NOT e)
      // https://www.dcode.fr/boolean-expressions-calculator
      const lists: List[] = [
        {
          field: 'b',
          values_operator: 'included',
          values_type: 'match_all',
          values: [
            {
              name: 'value',
            },
            {
              name: 'value-1',
            },
          ],
          and: [
            {
              field: 'c',
              values_operator: 'excluded',
              values_type: 'match_all',
              values: [
                {
                  name: 'valueC',
                },
                {
                  name: 'value-2',
                },
              ],
            },
            {
              field: 'd',
              values_operator: 'included',
              values_type: 'match_all',
              values: [
                {
                  name: 'valueD',
                },
                {
                  name: 'value-3',
                },
              ],
            },
          ],
        },
        {
          field: 'e',
          values_operator: 'included',
          values_type: 'match_all',
          values: [
            {
              name: 'valueE',
            },
            {
              name: 'value-4',
            },
          ],
        },
      ];
      const query = buildQueryExceptions({ query: 'a:*', language: 'kuery', lists });
      const expectedQuery =
        '(a:* and not b:(value or value-1) and c:(valueC or value-2) and not d:(valueD or value-3)) or (a:* and not e:(valueE or value-4))';

      expect(query).toEqual([{ query: expectedQuery, language: 'kuery' }]);
    });

    test('it returns expected query when lists exist and language is "lucene"', () => {
      // Equal to query && !((b || !c || d) && e) -> ((query AND NOT b AND c AND NOT d) OR (query AND NOT e)
      // https://www.dcode.fr/boolean-expressions-calculator
      const lists: List[] = [
        {
          field: 'b',
          values_operator: 'included',
          values_type: 'match_all',
          values: [
            {
              name: 'value',
            },
            {
              name: 'value-1',
            },
          ],
          and: [
            {
              field: 'c',
              values_operator: 'excluded',
              values_type: 'match_all',
              values: [
                {
                  name: 'valueC',
                },
                {
                  name: 'value-2',
                },
              ],
            },
            {
              field: 'd',
              values_operator: 'included',
              values_type: 'match_all',
              values: [
                {
                  name: 'valueD',
                },
                {
                  name: 'value-3',
                },
              ],
            },
          ],
        },
        {
          field: 'e',
          values_operator: 'included',
          values_type: 'match_all',
          values: [
            {
              name: 'valueE',
            },
            {
              name: 'value-4',
            },
          ],
        },
      ];
      const query = buildQueryExceptions({ query: 'a:*', language: 'lucene', lists });
      const expectedQuery =
        '(a:* AND NOT b:(value OR value-1) AND c:(valueC OR value-2) AND NOT d:(valueD OR value-3)) OR (a:* AND NOT e:(valueE OR value-4))';

      expect(query).toEqual([{ query: expectedQuery, language: 'lucene' }]);
    });
  });
});
