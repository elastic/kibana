/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getPivotDropdownOptions } from '../common';
import { IndexPattern } from '../../../../../../../../../../src/plugins/data/public';
import { FilterAggForm } from './filter_agg/components';

describe('Transform: Define Pivot Common', () => {
  test('getPivotDropdownOptions()', () => {
    // The field name includes the characters []> as well as a leading and ending space charcter
    // which cannot be used for aggregation names. The test results verifies that the characters
    // should still be present in field and dropDownName values, but should be stripped for aggName values.
    const indexPattern = {
      id: 'the-index-pattern-id',
      title: 'the-index-pattern-title',
      fields: [
        {
          name: ' the-f[i]e>ld ',
          type: 'number',
          aggregatable: true,
          filterable: true,
          searchable: true,
        },
      ],
    } as IndexPattern;

    const options = getPivotDropdownOptions(indexPattern);

    expect(options).toMatchObject({
      aggOptions: [
        {
          label: ' the-f[i]e>ld ',
          options: [
            { label: 'avg( the-f[i]e>ld )' },
            { label: 'cardinality( the-f[i]e>ld )' },
            { label: 'max( the-f[i]e>ld )' },
            { label: 'min( the-f[i]e>ld )' },
            { label: 'percentiles( the-f[i]e>ld )' },
            { label: 'sum( the-f[i]e>ld )' },
            { label: 'value_count( the-f[i]e>ld )' },
            { label: 'filter( the-f[i]e>ld )' },
          ],
        },
      ],
      aggOptionsData: {
        'avg( the-f[i]e>ld )': {
          agg: 'avg',
          field: ' the-f[i]e>ld ',
          aggName: 'the-field.avg',
          dropDownName: 'avg( the-f[i]e>ld )',
        },
        'cardinality( the-f[i]e>ld )': {
          agg: 'cardinality',
          field: ' the-f[i]e>ld ',
          aggName: 'the-field.cardinality',
          dropDownName: 'cardinality( the-f[i]e>ld )',
        },
        'max( the-f[i]e>ld )': {
          agg: 'max',
          field: ' the-f[i]e>ld ',
          aggName: 'the-field.max',
          dropDownName: 'max( the-f[i]e>ld )',
        },
        'min( the-f[i]e>ld )': {
          agg: 'min',
          field: ' the-f[i]e>ld ',
          aggName: 'the-field.min',
          dropDownName: 'min( the-f[i]e>ld )',
        },
        'percentiles( the-f[i]e>ld )': {
          agg: 'percentiles',
          field: ' the-f[i]e>ld ',
          aggName: 'the-field.percentiles',
          dropDownName: 'percentiles( the-f[i]e>ld )',
          percents: [1, 5, 25, 50, 75, 95, 99],
        },
        'filter( the-f[i]e>ld )': {
          agg: 'filter',
          field: ' the-f[i]e>ld ',
          aggName: 'the-field.filter',
          dropDownName: 'filter( the-f[i]e>ld )',
          AggFormComponent: FilterAggForm,
        },
        'sum( the-f[i]e>ld )': {
          agg: 'sum',
          field: ' the-f[i]e>ld ',
          aggName: 'the-field.sum',
          dropDownName: 'sum( the-f[i]e>ld )',
        },
        'value_count( the-f[i]e>ld )': {
          agg: 'value_count',
          field: ' the-f[i]e>ld ',
          aggName: 'the-field.value_count',
          dropDownName: 'value_count( the-f[i]e>ld )',
        },
      },
      groupByOptions: [{ label: 'histogram( the-f[i]e>ld )' }],
      groupByOptionsData: {
        'histogram( the-f[i]e>ld )': {
          agg: 'histogram',
          field: ' the-f[i]e>ld ',
          aggName: 'the-field',
          dropDownName: 'histogram( the-f[i]e>ld )',
          interval: '10',
        },
      },
    });
  });
});
