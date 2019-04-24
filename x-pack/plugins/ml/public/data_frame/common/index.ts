/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DefaultOperator } from 'elasticsearch';

import { StaticIndexPattern } from 'ui/index_patterns';

import { Dictionary, dictionaryToArray } from '../../../common/types/common';

import { DefinePivotExposedState } from '../components/define_pivot/define_pivot_form';
import { JobDetailsExposedState } from '../components/job_details/job_details_form';

import { PivotGroupByConfig } from '../common';

import {
  dateHistogramIntervalFormatRegex,
  DATE_HISTOGRAM_FORMAT,
  PIVOT_SUPPORTED_GROUP_BY_AGGS,
} from './pivot_group_by';

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
export interface PivotAggsConfig {
  agg: PivotAggSupportedAggs;
  field: FieldName;
  formRowLabel: AggName;
}

export type PivotAggsConfigDict = Dictionary<PivotAggsConfig>;

export interface SimpleQuery {
  query_string: {
    query: string;
    default_operator: DefaultOperator;
  };
}

// DataFramePreviewRequest
interface TermsAgg {
  terms: {
    field: FieldName;
  };
}

interface HistogramAgg {
  histogram: {
    field: FieldName;
    interval: string;
  };
}

interface DateHistogramAgg {
  date_histogram: {
    field: FieldName;
    format?: DATE_HISTOGRAM_FORMAT;
    interval: string;
  };
}

type PivotGroupBy = TermsAgg | HistogramAgg | DateHistogramAgg;
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
  groupBy: PivotGroupByConfig[],
  aggs: PivotAggsConfig[]
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
    if (g.agg === PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS) {
      const termsAgg: TermsAgg = {
        terms: {
          field: g.field,
        },
      };
      request.pivot.group_by[g.formRowLabel] = termsAgg;
    } else if (g.agg === PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM) {
      const histogramAgg: HistogramAgg = {
        histogram: {
          field: g.field,
          interval: g.interval,
        },
      };
      request.pivot.group_by[g.formRowLabel] = histogramAgg;
    } else if (g.agg === PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM) {
      const dateHistogramAgg: DateHistogramAgg = {
        date_histogram: {
          field: g.field,
          interval: g.interval,
        },
      };

      const timeUnitMatch = g.interval.match(dateHistogramIntervalFormatRegex);
      if (timeUnitMatch !== null && Array.isArray(timeUnitMatch) && timeUnitMatch.length === 2) {
        // the following is just a TS compatible way of using the
        // matched string like `d` as the property to access the enum.
        dateHistogramAgg.date_histogram.format =
          DATE_HISTOGRAM_FORMAT[timeUnitMatch[1] as keyof typeof DATE_HISTOGRAM_FORMAT];
      }
      request.pivot.group_by[g.formRowLabel] = dateHistogramAgg;
    }
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
  jobDetailsState: JobDetailsExposedState
): DataFrameRequest {
  const request: DataFrameRequest = {
    ...getDataFramePreviewRequest(
      indexPatternTitle,
      getPivotQuery(pivotState.search),
      dictionaryToArray(pivotState.groupByList),
      pivotState.aggs
    ),
    dest: {
      index: jobDetailsState.targetIndex,
    },
  };

  return request;
}

export * from './index_pattern_context';
export * from './pivot_group_by';
