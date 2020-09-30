/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PIVOT_SUPPORTED_AGGS } from '../../../common/types/pivot_aggs';

import {
  getPreviewTransformRequestBody,
  PivotAggsConfig,
  PivotGroupByConfig,
  PIVOT_SUPPORTED_GROUP_BY_AGGS,
  SimpleQuery,
} from '../common';

import { getIndexDevConsoleStatement, getPivotPreviewDevConsoleStatement } from './data_grid';

describe('Transform: Data Grid', () => {
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
    const request = getPreviewTransformRequestBody(
      'the-index-pattern-title',
      query,
      [groupBy],
      [agg]
    );
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

describe('Transform: Index Preview Common', () => {
  test('getIndexDevConsoleStatement()', () => {
    const query: SimpleQuery = {
      query_string: {
        query: '*',
        default_operator: 'AND',
      },
    };
    const indexPreviewDevConsoleStatement = getIndexDevConsoleStatement(
      query,
      'the-index-pattern-title'
    );

    expect(indexPreviewDevConsoleStatement).toBe(`GET the-index-pattern-title/_search
{
  "query": {
    "query_string": {
      "query": "*",
      "default_operator": "AND"
    }
  }
}
`);
  });
});
