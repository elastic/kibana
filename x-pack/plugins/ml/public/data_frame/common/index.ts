/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DefaultOperator } from 'elasticsearch';

import { StaticIndexPattern } from 'ui/index_patterns';

import { Dictionary } from '../../../common/types/common';

import { DefinePivotExposedState } from '../components/define_pivot/define_pivot_form';

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

// The internal representation of an aggregation definition.
type AggName = string;
type FieldName = string;
export interface OptionsDataElement {
  agg: PivotAggSupportedAggs;
  field: FieldName;
  formRowLabel: AggName;
}

export type OptionsDataElementDict = Dictionary<OptionsDataElement>;

export interface SimpleQuery {
  query_string: {
    query: string;
    default_operator: DefaultOperator;
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

export enum PIVOT_SUPPORTED_AGGS {
  AVG = 'avg',
  CARDINALITY = 'cardinality',
  MAX = 'max',
  MIN = 'min',
  SUM = 'sum',
  VALUE_COUNT = 'value_count',
}

type PivotAggSupportedAggs =
  | PIVOT_SUPPORTED_AGGS.AVG
  | PIVOT_SUPPORTED_AGGS.CARDINALITY
  | PIVOT_SUPPORTED_AGGS.MAX
  | PIVOT_SUPPORTED_AGGS.MIN
  | PIVOT_SUPPORTED_AGGS.SUM
  | PIVOT_SUPPORTED_AGGS.VALUE_COUNT;

type PivotAgg = {
  [key in PivotAggSupportedAggs]?: {
    field: FieldName;
  }
};
type PivotAggDict = { [key in AggName]: PivotAgg };

export interface DataFramePreviewRequest {
  pivot: {
    group_by: PivotGroupByDict;
    aggregations: PivotAggDict;
  };
  source: {
    index: string;
    query?: any;
  };
}

export interface DataFrameRequest extends DataFramePreviewRequest {
  dest: {
    index: string;
  };
}

export interface DataFrameJobConfig extends DataFrameRequest {
  id: string;
}

export const pivotSupportedAggs = [
  PIVOT_SUPPORTED_AGGS.AVG,
  PIVOT_SUPPORTED_AGGS.CARDINALITY,
  PIVOT_SUPPORTED_AGGS.MAX,
  PIVOT_SUPPORTED_AGGS.MIN,
  PIVOT_SUPPORTED_AGGS.SUM,
  PIVOT_SUPPORTED_AGGS.VALUE_COUNT,
] as PivotAggSupportedAggs[];

export function getPivotQuery(search: string): SimpleQuery {
  return {
    query_string: {
      query: search,
      default_operator: 'AND',
    },
  };
}

export function getDataFramePreviewRequest(
  indexPatternTitle: StaticIndexPattern['title'],
  query: SimpleQuery,
  groupBy: string[],
  aggs: OptionsDataElement[]
): DataFramePreviewRequest {
  const request: DataFramePreviewRequest = {
    source: {
      index: indexPatternTitle,
      query,
    },
    pivot: {
      group_by: {},
      aggregations: {},
    },
  };

  groupBy.forEach(g => {
    request.pivot.group_by[g] = {
      terms: {
        field: g,
      },
    };
  });

  aggs.forEach(agg => {
    request.pivot.aggregations[agg.formRowLabel] = {
      [agg.agg]: {
        field: agg.field,
      },
    };
  });

  return request;
}

export function getDataFrameRequest(
  indexPatternTitle: StaticIndexPattern['title'],
  pivotState: DefinePivotExposedState,
  jobDetailsState: any
): DataFrameRequest {
  const request: DataFrameRequest = {
    ...getDataFramePreviewRequest(
      indexPatternTitle,
      getPivotQuery(pivotState.search),
      pivotState.groupBy,
      pivotState.aggs
    ),
    dest: {
      index: jobDetailsState.targetIndex,
    },
  };

  return request;
}

export * from './index_pattern_context';
