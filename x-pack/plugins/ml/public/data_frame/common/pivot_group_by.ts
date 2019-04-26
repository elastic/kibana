/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dictionary } from '../../../common/types/common';

import { AggName, FieldName } from './aggregations';

export enum PIVOT_SUPPORTED_GROUP_BY_AGGS {
  DATE_HISTOGRAM = 'date_histogram',
  HISTOGRAM = 'histogram',
  TERMS = 'terms',
}

export type PivotSupportedGroupByAggs =
  | PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM
  | PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM
  | PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS;

export type PivotSupportedGroupByAggsWithInterval =
  | PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM
  | PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM;

interface GroupByConfigBase {
  field: FieldName;
  aggName: AggName;
}

// Don't allow an interval of '0', but allow a float interval of '0.1' with a leading zero.
export const histogramIntervalFormatRegex = /^([1-9][0-9]*((\.)([0-9]+))?|([0](\.)([0-9]+)))$/;
// Don't allow intervals of '0', don't allow floating intervals.
export const dateHistogramIntervalFormatRegex = /^[1-9][0-9]*(ms|s|m|h|d|w|M|q|y)$/;

export enum DATE_HISTOGRAM_FORMAT {
  ms = 'yyyy-MM-dd HH:mm:ss.SSS',
  s = 'yyyy-MM-dd HH:mm:ss',
  m = 'yyyy-MM-dd HH:mm',
  h = 'yyyy-MM-dd HH:00',
  d = 'yyyy-MM-dd',
  M = 'yyyy-MM-01',
  y = 'yyyy',
}

interface GroupByDateHistogram extends GroupByConfigBase {
  agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM;
  format?: DATE_HISTOGRAM_FORMAT;
  interval: string;
}

interface GroupByHistogram extends GroupByConfigBase {
  agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM;
  interval: string;
}

interface GroupByTerms extends GroupByConfigBase {
  agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS;
}

export type GroupByConfigWithInterval = GroupByDateHistogram | GroupByHistogram;
export type PivotGroupByConfig = GroupByDateHistogram | GroupByHistogram | GroupByTerms;
export type PivotGroupByConfigDict = Dictionary<PivotGroupByConfig>;

export function groupByConfigHasInterval(arg: any): arg is GroupByConfigWithInterval {
  return arg.hasOwnProperty('interval');
}

export interface TermsAgg {
  terms: {
    field: FieldName;
  };
}

export interface HistogramAgg {
  histogram: {
    field: FieldName;
    interval: string;
  };
}

export interface DateHistogramAgg {
  date_histogram: {
    field: FieldName;
    format?: DATE_HISTOGRAM_FORMAT;
    interval: string;
  };
}

type PivotGroupBy = TermsAgg | HistogramAgg | DateHistogramAgg;
export type PivotGroupByDict = Dictionary<PivotGroupBy>;
