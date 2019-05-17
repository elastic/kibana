/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StaticIndexPattern } from 'ui/index_patterns';

import {
  getDataFramePreviewRequest,
  PivotAggsConfig,
  PivotGroupByConfig,
  PIVOT_SUPPORTED_AGGS,
  PIVOT_SUPPORTED_GROUP_BY_AGGS,
  SimpleQuery,
} from '../../common';

import { getPivotPreviewDevConsoleStatement, getPivotDropdownOptions } from './common';

describe('Data Frame: Define Pivot Common', () => {
  test('getPivotDropdownOptions()', () => {
    const indexPattern: StaticIndexPattern = {
      title: 'the-index-pattern-title',
      fields: [{ name: 'the-field', type: 'number', aggregatable: true, searchable: true }],
    };

    const options = getPivotDropdownOptions(indexPattern);

    expect(options).toEqual({
      aggOptions: [
        {
          label: 'the-field',
          options: [
            { label: 'avg(the-field)' },
            { label: 'max(the-field)' },
            { label: 'min(the-field)' },
            { label: 'sum(the-field)' },
            { label: 'value_count(the-field)' },
          ],
        },
      ],
      aggOptionsData: {
        'avg(the-field)': { agg: 'avg', field: 'the-field', aggName: 'avg(the-field)' },
        'max(the-field)': { agg: 'max', field: 'the-field', aggName: 'max(the-field)' },
        'min(the-field)': { agg: 'min', field: 'the-field', aggName: 'min(the-field)' },
        'sum(the-field)': { agg: 'sum', field: 'the-field', aggName: 'sum(the-field)' },
        'value_count(the-field)': {
          agg: 'value_count',
          field: 'the-field',
          aggName: 'value_count(the-field)',
        },
      },
      groupByOptions: [{ label: 'histogram(the-field)' }],
      groupByOptionsData: {
        'histogram(the-field)': {
          agg: 'histogram',
          field: 'the-field',
          aggName: 'histogram(the-field)',
          interval: '10',
        },
      },
    });
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
      aggName: 'the-group-by-label',
    };
    const agg: PivotAggsConfig = {
      agg: PIVOT_SUPPORTED_AGGS.AVG,
      field: 'the-agg-field',
      aggName: 'the-agg-label',
    };
    const request = getDataFramePreviewRequest('the-index-pattern-title', query, [groupBy], [agg]);
    const pivotPreviewDevConsoleStatement = getPivotPreviewDevConsoleStatement(request);

    expect(pivotPreviewDevConsoleStatement).toBe(`POST _data_frame/transforms/_preview
{
  "source": {
    "index": "the-index-pattern-title",
    "query": {
      "query_string": {
        "query": "*",
        "default_operator": "AND"
      }
    }
  },
  "pivot": {
    "group_by": {
      "the-group-by-label": {
        "terms": {
          "field": "the-group-by-field"
        }
      }
    },
    "aggregations": {
      "the-agg-label": {
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
