/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPivotDropdownOptions } from '.';
import { DataView } from '@kbn/data-views-plugin/public';
import { FilterAggForm } from './filter_agg/components';
import type { RuntimeField } from '@kbn/data-plugin/common';

describe('Transform: Define Pivot Common', () => {
  test('getPivotDropdownOptions()', () => {
    // The field name includes the characters []> as well as a leading and ending space character
    // which cannot be used for aggregation names. The test results verifies that the characters
    // should still be present in field and dropDownName values, but should be stripped for aggName values.
    const dataView = {
      id: 'the-data-view-id',
      title: 'the-data-view-title',
      fields: [
        {
          name: ' the-f[i]e>ld ',
          type: 'number',
          aggregatable: true,
          filterable: true,
          searchable: true,
        },
      ],
    } as DataView;

    const options = getPivotDropdownOptions(dataView);

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
            { label: 'top_metrics( the-f[i]e>ld )' },
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

    const runtimeMappings = {
      rt_bytes_bigger: {
        type: 'double',
        script: {
          source: "emit(doc['bytes'].value * 2.0)",
        },
      } as RuntimeField,
    };
    const optionsWithRuntimeFields = getPivotDropdownOptions(dataView, runtimeMappings);
    expect(optionsWithRuntimeFields).toMatchObject({
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
            { label: 'top_metrics( the-f[i]e>ld )' },
          ],
        },
        {
          label: 'rt_bytes_bigger',
          options: [
            { label: 'avg(rt_bytes_bigger)' },
            { label: 'cardinality(rt_bytes_bigger)' },
            { label: 'max(rt_bytes_bigger)' },
            { label: 'min(rt_bytes_bigger)' },
            { label: 'percentiles(rt_bytes_bigger)' },
            { label: 'sum(rt_bytes_bigger)' },
            { label: 'value_count(rt_bytes_bigger)' },
            { label: 'filter(rt_bytes_bigger)' },
            { label: 'top_metrics(rt_bytes_bigger)' },
          ],
        },
      ],
      aggOptionsData: {
        'avg( the-f[i]e>ld )': {
          agg: 'avg',
          aggName: 'the-field.avg',
          dropDownName: 'avg( the-f[i]e>ld )',
          field: ' the-f[i]e>ld ',
        },
        'cardinality( the-f[i]e>ld )': {
          agg: 'cardinality',
          aggName: 'the-field.cardinality',
          dropDownName: 'cardinality( the-f[i]e>ld )',
          field: ' the-f[i]e>ld ',
        },
        'max( the-f[i]e>ld )': {
          agg: 'max',
          aggName: 'the-field.max',
          dropDownName: 'max( the-f[i]e>ld )',
          field: ' the-f[i]e>ld ',
        },
        'min( the-f[i]e>ld )': {
          agg: 'min',
          aggName: 'the-field.min',
          dropDownName: 'min( the-f[i]e>ld )',
          field: ' the-f[i]e>ld ',
        },
        'percentiles( the-f[i]e>ld )': {
          agg: 'percentiles',
          aggName: 'the-field.percentiles',
          dropDownName: 'percentiles( the-f[i]e>ld )',
          field: ' the-f[i]e>ld ',
          percents: [1, 5, 25, 50, 75, 95, 99],
        },
        'sum( the-f[i]e>ld )': {
          agg: 'sum',
          aggName: 'the-field.sum',
          dropDownName: 'sum( the-f[i]e>ld )',
          field: ' the-f[i]e>ld ',
        },
        'value_count( the-f[i]e>ld )': {
          agg: 'value_count',
          aggName: 'the-field.value_count',
          dropDownName: 'value_count( the-f[i]e>ld )',
          field: ' the-f[i]e>ld ',
        },
        'filter( the-f[i]e>ld )': {
          agg: 'filter',
          aggName: 'the-field.filter',
          dropDownName: 'filter( the-f[i]e>ld )',
          field: ' the-f[i]e>ld ',
          isSubAggsSupported: true,
          AggFormComponent: FilterAggForm,
        },
        'avg(rt_bytes_bigger)': {
          agg: 'avg',
          aggName: 'rt_bytes_bigger.avg',
          dropDownName: 'avg(rt_bytes_bigger)',
          field: 'rt_bytes_bigger',
        },
        'cardinality(rt_bytes_bigger)': {
          agg: 'cardinality',
          aggName: 'rt_bytes_bigger.cardinality',
          dropDownName: 'cardinality(rt_bytes_bigger)',
          field: 'rt_bytes_bigger',
        },
        'max(rt_bytes_bigger)': {
          agg: 'max',
          aggName: 'rt_bytes_bigger.max',
          dropDownName: 'max(rt_bytes_bigger)',
          field: 'rt_bytes_bigger',
        },
        'min(rt_bytes_bigger)': {
          agg: 'min',
          aggName: 'rt_bytes_bigger.min',
          dropDownName: 'min(rt_bytes_bigger)',
          field: 'rt_bytes_bigger',
        },
        'percentiles(rt_bytes_bigger)': {
          agg: 'percentiles',
          aggName: 'rt_bytes_bigger.percentiles',
          dropDownName: 'percentiles(rt_bytes_bigger)',
          field: 'rt_bytes_bigger',
          percents: [1, 5, 25, 50, 75, 95, 99],
        },
        'sum(rt_bytes_bigger)': {
          agg: 'sum',
          aggName: 'rt_bytes_bigger.sum',
          dropDownName: 'sum(rt_bytes_bigger)',
          field: 'rt_bytes_bigger',
        },
        'value_count(rt_bytes_bigger)': {
          agg: 'value_count',
          aggName: 'rt_bytes_bigger.value_count',
          dropDownName: 'value_count(rt_bytes_bigger)',
          field: 'rt_bytes_bigger',
        },
        'filter(rt_bytes_bigger)': {
          agg: 'filter',
          aggName: 'rt_bytes_bigger.filter',
          dropDownName: 'filter(rt_bytes_bigger)',
          field: 'rt_bytes_bigger',
          isSubAggsSupported: true,
          AggFormComponent: FilterAggForm,
        },
      },
      groupByOptions: [
        { label: 'histogram( the-f[i]e>ld )' },
        { label: 'histogram(rt_bytes_bigger)' },
      ],
      groupByOptionsData: {
        'histogram( the-f[i]e>ld )': {
          agg: 'histogram',
          aggName: 'the-field',
          dropDownName: 'histogram( the-f[i]e>ld )',
          field: ' the-f[i]e>ld ',
          interval: '10',
        },
        'histogram(rt_bytes_bigger)': {
          agg: 'histogram',
          aggName: 'rt_bytes_bigger',
          dropDownName: 'histogram(rt_bytes_bigger)',
          field: 'rt_bytes_bigger',
          interval: '10',
        },
      },
    });
  });
});
