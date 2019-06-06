/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dictionary } from '../../../common/types/common';
import { KBN_FIELD_TYPES } from '../../../common/constants/field_types';

import { AggName } from './aggregations';
import { FieldName } from './fields';

export enum PIVOT_SUPPORTED_GROUP_BY_AGGS {
  DATE_HISTOGRAM = 'date_histogram',
  HISTOGRAM = 'histogram',
  TERMS = 'terms',
}

export type PivotSupportedGroupByAggs =
  | PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM
  | PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM
  | PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS;

export const pivotSupportedGroupByAggs: PivotSupportedGroupByAggs[] = [
  PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM,
  PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM,
  PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS,
];

export type PivotSupportedGroupByAggsWithInterval =
  | PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM
  | PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM;

export const pivotGroupByFieldSupport = {
  [KBN_FIELD_TYPES.ATTACHMENT]: [],
  [KBN_FIELD_TYPES.BOOLEAN]: [],
  [KBN_FIELD_TYPES.DATE]: [PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM],
  [KBN_FIELD_TYPES.GEO_POINT]: [],
  [KBN_FIELD_TYPES.GEO_SHAPE]: [],
  [KBN_FIELD_TYPES.IP]: [PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS],
  [KBN_FIELD_TYPES.MURMUR3]: [],
  [KBN_FIELD_TYPES.NUMBER]: [PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM],
  [KBN_FIELD_TYPES.STRING]: [PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS],
  [KBN_FIELD_TYPES._SOURCE]: [],
  [KBN_FIELD_TYPES.UNKNOWN]: [],
  [KBN_FIELD_TYPES.CONFLICT]: [],
};

interface GroupByConfigBase {
  field: FieldName;
  aggName: AggName;
  dropDownName: string;
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
  calendar_interval: string;
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

export function isGroupByDateHistogram(arg: any): arg is GroupByDateHistogram {
  return arg.hasOwnProperty('calendar_interval');
}

export function isGroupByHistogram(arg: any): arg is GroupByHistogram {
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
    calendar_interval: string;
  };
}

type PivotGroupBy = TermsAgg | HistogramAgg | DateHistogramAgg;
export type PivotGroupByDict = Dictionary<PivotGroupBy>;
