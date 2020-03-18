/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiDataGridSorting } from '@elastic/eui';

import {
  getPreviewRequestBody,
  PivotAggsConfig,
  PivotGroupByConfig,
  PIVOT_SUPPORTED_AGGS,
  PIVOT_SUPPORTED_GROUP_BY_AGGS,
  SimpleQuery,
} from '../../common';

import { multiColumnSortFactory, getPivotPreviewDevConsoleStatement } from './common';

describe('Transform: Define Pivot Common', () => {
  test('multiColumnSortFactory()', () => {
    const data = [
      { s: 'a', n: 1 },
      { s: 'a', n: 2 },
      { s: 'b', n: 3 },
      { s: 'b', n: 4 },
    ];

    const sortingColumns1: EuiDataGridSorting['columns'] = [{ id: 's', direction: 'desc' }];
    const multiColumnSort1 = multiColumnSortFactory(sortingColumns1);
    data.sort(multiColumnSort1);

    expect(data).toStrictEqual([
      { s: 'b', n: 3 },
      { s: 'b', n: 4 },
      { s: 'a', n: 1 },
      { s: 'a', n: 2 },
    ]);

    const sortingColumns2: EuiDataGridSorting['columns'] = [
      { id: 's', direction: 'asc' },
      { id: 'n', direction: 'desc' },
    ];
    const multiColumnSort2 = multiColumnSortFactory(sortingColumns2);
    data.sort(multiColumnSort2);

    expect(data).toStrictEqual([
      { s: 'a', n: 2 },
      { s: 'a', n: 1 },
      { s: 'b', n: 4 },
      { s: 'b', n: 3 },
    ]);

    const sortingColumns3: EuiDataGridSorting['columns'] = [
      { id: 'n', direction: 'desc' },
      { id: 's', direction: 'desc' },
    ];
    const multiColumnSort3 = multiColumnSortFactory(sortingColumns3);
    data.sort(multiColumnSort3);

    expect(data).toStrictEqual([
      { s: 'b', n: 4 },
      { s: 'b', n: 3 },
      { s: 'a', n: 2 },
      { s: 'a', n: 1 },
    ]);
  });

  test('getPivotPreviewDevConsoleStatement()', () => {
    const query: SimpleQuery = {
      query_string: {
        query: '*',
        default_operator: 'AND',
      },
    };
    const groupBy: PivotGroupByConfig = {
      agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS,
      field: 'the-group-by-field',
      aggName: 'the-group-by-agg-name',
      dropDownName: 'the-group-by-drop-down-name',
    };
    const agg: PivotAggsConfig = {
      agg: PIVOT_SUPPORTED_AGGS.AVG,
      field: 'the-agg-field',
      aggName: 'the-agg-agg-name',
      dropDownName: 'the-agg-drop-down-name',
    };
    const request = getPreviewRequestBody('the-index-pattern-title', query, [groupBy], [agg]);
    const pivotPreviewDevConsoleStatement = getPivotPreviewDevConsoleStatement(request);

    expect(pivotPreviewDevConsoleStatement).toBe(`POST _transform/_preview
{
  "source": {
    "index": [
      "the-index-pattern-title"
    ]
  },
  "pivot": {
    "group_by": {
      "the-group-by-agg-name": {
        "terms": {
          "field": "the-group-by-field"
        }
      }
    },
    "aggregations": {
      "the-agg-agg-name": {
        "avg": {
          "field": "the-agg-field"
        }
      }
    }
  }
}
`);
  });
});
