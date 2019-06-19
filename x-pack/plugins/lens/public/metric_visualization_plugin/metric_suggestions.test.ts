/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSuggestions } from './metric_suggestions';
import { TableColumn } from '../types';

describe('metric_suggestions', () => {
  function numCol(columnId: string): TableColumn {
    return {
      columnId,
      operation: {
        dataType: 'number',
        id: `avg_${columnId}`,
        label: `Avg ${columnId}`,
        isBucketed: false,
      },
    };
  }

  function strCol(columnId: string): TableColumn {
    return {
      columnId,
      operation: {
        dataType: 'string',
        id: `terms_${columnId}`,
        label: `Top 5 ${columnId}`,
        isBucketed: true,
      },
    };
  }

  function dateCol(columnId: string): TableColumn {
    return {
      columnId,
      operation: {
        dataType: 'date',
        id: `date_histogram_${columnId}`,
        isBucketed: true,
        label: `${columnId} histogram`,
      },
    };
  }

  test('ignores invalid combinations', () => {
    const unknownCol = () => {
      const str = strCol('foo');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { ...str, operation: { ...str.operation, dataType: 'wonkies' } } as any;
    };

    expect(
      getSuggestions({
        tables: [
          { datasourceSuggestionId: 0, isMultiRow: true, columns: [dateCol('a')] },
          { datasourceSuggestionId: 1, isMultiRow: true, columns: [strCol('foo'), strCol('bar')] },
          { datasourceSuggestionId: 2, isMultiRow: true, columns: [numCol('bar')] },
          { datasourceSuggestionId: 3, isMultiRow: true, columns: [unknownCol(), numCol('bar')] },
          { datasourceSuggestionId: 4, isMultiRow: false, columns: [numCol('bar'), numCol('baz')] },
        ],
      })
    ).toEqual([]);
  });

  test('suggests a basic metric chart', () => {
    const [suggestion, ...rest] = getSuggestions({
      tables: [
        {
          datasourceSuggestionId: 0,
          isMultiRow: false,
          columns: [numCol('bytes')],
        },
      ],
    });

    expect(rest).toHaveLength(0);
    expect(suggestion).toMatchInlineSnapshot(`
Object {
  "datasourceSuggestionId": 0,
  "score": 1,
  "state": Object {
    "accessor": "bytes",
    "title": "Avg bytes",
  },
  "title": "Avg bytes",
}
`);
  });
});
