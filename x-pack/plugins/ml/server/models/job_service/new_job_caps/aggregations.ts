/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Aggregation } from '../../../../common/types/fields';

export const aggregations: Aggregation[] = [
  {
    id: 'count',
    title: 'Count',
    kibanaName: 'count',
    dslName: 'count',
    type: 'metrics',
    mlModelPlotAgg: {
      max: 'max',
      min: 'min',
    },
    fields: [],
  },
  {
    id: 'high_count',
    title: 'High count',
    kibanaName: 'count',
    dslName: 'count',
    type: 'metrics',
    mlModelPlotAgg: {
      max: 'max',
      min: 'min',
    },
    fields: [],
  },
  {
    id: 'low_count',
    title: 'Low count',
    kibanaName: 'count',
    dslName: 'count',
    type: 'metrics',
    mlModelPlotAgg: {
      max: 'max',
      min: 'min',
    },
    fields: [],
  },
  {
    id: 'mean',
    title: 'Mean',
    kibanaName: 'avg',
    dslName: 'avg',
    type: 'metrics',
    mlModelPlotAgg: {
      max: 'avg',
      min: 'avg',
    },
    fields: [],
  },
  {
    id: 'high_mean',
    title: 'High mean',
    kibanaName: 'avg',
    dslName: 'avg',
    type: 'metrics',
    mlModelPlotAgg: {
      max: 'avg',
      min: 'avg',
    },
    fields: [],
  },
  {
    id: 'low_mean',
    title: 'Low mean',
    kibanaName: 'avg',
    dslName: 'avg',
    type: 'metrics',
    mlModelPlotAgg: {
      max: 'avg',
      min: 'avg',
    },
    fields: [],
  },
  {
    id: 'sum',
    title: 'Sum',
    kibanaName: 'sum',
    dslName: 'sum',
    type: 'metrics',
    mlModelPlotAgg: {
      max: 'sum',
      min: 'sum',
    },
    fields: [],
  },
  {
    id: 'high_sum',
    title: 'High sum',
    kibanaName: 'sum',
    dslName: 'sum',
    type: 'metrics',
    mlModelPlotAgg: {
      max: 'sum',
      min: 'sum',
    },
    fields: [],
  },
  {
    id: 'low_sum',
    title: 'Low sum',
    kibanaName: 'sum',
    dslName: 'sum',
    type: 'metrics',
    mlModelPlotAgg: {
      max: 'sum',
      min: 'sum',
    },
    fields: [],
  },
  {
    id: 'median',
    title: 'Median',
    kibanaName: 'median',
    dslName: 'percentiles',
    type: 'metrics',
    mlModelPlotAgg: {
      max: 'max',
      min: 'min',
    },
    fields: [],
  },
  {
    id: 'high_median',
    title: 'High median',
    kibanaName: 'median',
    dslName: 'percentiles',
    type: 'metrics',
    mlModelPlotAgg: {
      max: 'max',
      min: 'min',
    },
    fields: [],
  },
  {
    id: 'low_median',
    title: 'Low median',
    kibanaName: 'median',
    dslName: 'percentiles',
    type: 'metrics',
    mlModelPlotAgg: {
      max: 'max',
      min: 'min',
    },
    fields: [],
  },
  {
    id: 'min',
    title: 'Min',
    kibanaName: 'min',
    dslName: 'min',
    type: 'metrics',
    mlModelPlotAgg: {
      max: 'min',
      min: 'min',
    },
    fields: [],
  },
  {
    id: 'max',
    title: 'Max',
    kibanaName: 'max',
    dslName: 'max',
    type: 'metrics',
    mlModelPlotAgg: {
      max: 'max',
      min: 'max',
    },
    fields: [],
  },
  {
    id: 'distinct_count',
    title: 'Distinct count',
    kibanaName: 'cardinality',
    dslName: 'cardinality',
    type: 'metrics',
    mlModelPlotAgg: {
      max: 'max',
      min: 'min',
    },
    fields: [],
  },
];
