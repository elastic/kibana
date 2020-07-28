/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSuggestions } from './metric_suggestions';
import { TableSuggestionColumn, TableSuggestion } from '../index';

describe('metric_suggestions', () => {
  function numCol(columnId: string): TableSuggestionColumn {
    return {
      columnId,
      operation: {
        dataType: 'number',
        label: `Avg ${columnId}`,
        isBucketed: false,
      },
    };
  }

  function strCol(columnId: string): TableSuggestionColumn {
    return {
      columnId,
      operation: {
        dataType: 'string',
        label: `Top 5 ${columnId}`,
        isBucketed: true,
      },
    };
  }

  function dateCol(columnId: string): TableSuggestionColumn {
    return {
      columnId,
      operation: {
        dataType: 'date',
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
      ([
        {
          columns: [dateCol('a')],
          isMultiRow: true,
          layerId: 'l1',
          changeType: 'unchanged',
        },
        {
          columns: [strCol('foo'), strCol('bar')],
          isMultiRow: true,
          layerId: 'l1',
          changeType: 'unchanged',
        },
        {
          layerId: 'l1',
          isMultiRow: true,
          columns: [numCol('bar')],
          changeType: 'unchanged',
        },
        {
          columns: [unknownCol(), numCol('bar')],
          isMultiRow: true,
          layerId: 'l1',
          changeType: 'unchanged',
        },
        {
          columns: [numCol('bar'), numCol('baz')],
          isMultiRow: false,
          layerId: 'l1',
          changeType: 'unchanged',
        },
      ] as TableSuggestion[]).map((table) =>
        expect(getSuggestions({ table, keptLayerIds: ['l1'] })).toEqual([])
      )
    );
  });

  test('suggests a basic metric chart', () => {
    const [suggestion, ...rest] = getSuggestions({
      table: {
        columns: [numCol('bytes')],
        isMultiRow: false,
        layerId: 'l1',
        changeType: 'unchanged',
      },
      keptLayerIds: [],
    });

    expect(rest).toHaveLength(0);
    expect(suggestion).toMatchInlineSnapshot(`
      Object {
        "previewIcon": "test-file-stub",
        "score": 0.1,
        "state": Object {
          "accessor": "bytes",
          "layerId": "l1",
        },
        "title": "Avg bytes",
      }
    `);
  });

  test('does not suggest for multiple layers', () => {
    const suggestions = getSuggestions({
      table: {
        columns: [numCol('bytes')],
        isMultiRow: false,
        layerId: 'l1',
        changeType: 'unchanged',
      },
      keptLayerIds: ['l1', 'l2'],
    });

    expect(suggestions).toHaveLength(0);
  });

  test('does not suggest when the suggestion keeps a different layer', () => {
    const suggestions = getSuggestions({
      table: {
        columns: [numCol('bytes')],
        isMultiRow: false,
        layerId: 'newer',
        changeType: 'initial',
      },
      keptLayerIds: ['older'],
    });

    expect(suggestions).toHaveLength(0);
  });
});
