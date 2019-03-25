/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DefaultOperator } from 'elasticsearch';

import { Dictionary } from 'x-pack/plugins/ml/common/types/common';

// The display label used for an aggregation e.g. sum(bytes).
export type Label = string;

// Label object structured for EUI's ComboBox.
export interface DropDownLabel {
  label: Label;
}

// Label object structure for EUI's ComboBox with support for nesting.
export interface DropDownOption {
  label: Label;
  options: DropDownLabel[];
}

// The internal representation of an aggregatino definition.
export interface OptionsDataElement {
  agg: string;
  field: string;
  formRowLabel: string;
}

export type OptionsDataElementDict = Dictionary<OptionsDataElement>;

export interface SimpleQuery {
  query: {
    query_string: {
      query: string;
      default_operator: DefaultOperator;
    };
  };
}

// DataFramePreviewRequest
type PivotGroupBySupportedAggs = 'terms';
type PivotGroupBy = {
  [key in PivotGroupBySupportedAggs]: {
    field: string;
  }
};
type PivotGroupByDict = Dictionary<PivotGroupBy>;

type PivotAggSupportedAggs = 'avg' | 'cardinality' | 'max' | 'min' | 'sum' | 'value_count';
type PivotAgg = {
  [key in PivotAggSupportedAggs]: {
    field: string;
  }
};
type PivotAggDict = Dictionary<PivotAgg>;

export interface DataFramePreviewRequest {
  pivot: {
    group_by: PivotGroupByDict;
    aggregations: PivotAggDict;
  };
  query?: any;
  source: string;
}

export interface DataFrameRequest extends DataFramePreviewRequest {
  dest: string;
}
