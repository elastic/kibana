/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dictionary } from '../../../common/types/common';
import { KBN_FIELD_TYPES } from '../../../../../../src/plugins/data/common';

import { AggName } from './aggregations';
import { EsFieldName } from './fields';

export enum PIVOT_SUPPORTED_GROUP_BY_AGGS {
  DATE_HISTOGRAM = 'date_histogram',
  HISTOGRAM = 'histogram',
  TERMS = 'terms',
}

export type PivotSupportedGroupByAggs = PIVOT_SUPPORTED_GROUP_BY_AGGS;

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
  agg: PIVOT_SUPPORTED_GROUP_BY_AGGS;
  aggName: AggName;
  dropDownName: string;
}

// Don't allow an interval of '0', but allow a float interval of '0.1' with a leading zero.
export const histogramIntervalFormatRegex = /^([1-9][0-9]*((\.)([0-9]+))?|([0](\.)([0-9]+)))$/;
// Don't allow intervals of '0', don't allow floating intervals.
export const dateHistogramIntervalFormatRegex = /^[1-9][0-9]*(ms|s|m|h|d|w|M|q|y)$/;

interface GroupByDateHistogram extends GroupByConfigBase {
  agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM;
  field: EsFieldName;
  calendar_interval: string;
}

interface GroupByHistogram extends GroupByConfigBase {
  agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM;
  field: EsFieldName;
  interval: string;
}

interface GroupByTerms extends GroupByConfigBase {
  agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS;
  field: EsFieldName;
}

export type GroupByConfigWithInterval = GroupByDateHistogram | GroupByHistogram;
export type GroupByConfigWithUiSupport = GroupByDateHistogram | GroupByHistogram | GroupByTerms;

export type PivotGroupByConfig =
  | GroupByConfigBase
  | GroupByDateHistogram
  | GroupByHistogram
  | GroupByTerms;
export type PivotGroupByConfigWithUiSupportDict = Dictionary<GroupByConfigWithUiSupport>;
export type PivotGroupByConfigDict = Dictionary<PivotGroupByConfig>;

export function isGroupByDateHistogram(arg: any): arg is GroupByDateHistogram {
  return (
    arg.hasOwnProperty('agg') &&
    arg.hasOwnProperty('field') &&
    arg.hasOwnProperty('calendar_interval') &&
    arg.agg === PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM
  );
}

export function isGroupByHistogram(arg: any): arg is GroupByHistogram {
  return (
    arg.hasOwnProperty('agg') &&
    arg.hasOwnProperty('field') &&
    arg.hasOwnProperty('interval') &&
    arg.agg === PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM
  );
}

export function isGroupByTerms(arg: any): arg is GroupByTerms {
  return (
    arg.hasOwnProperty('agg') &&
    arg.hasOwnProperty('field') &&
    arg.agg === PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS
  );
}

export function isPivotGroupByConfigWithUiSupport(arg: any): arg is GroupByConfigWithUiSupport {
  return isGroupByDateHistogram(arg) || isGroupByHistogram(arg) || isGroupByTerms(arg);
}

export type GenericAgg = object;

export interface TermsAgg {
  terms: {
    field: EsFieldName;
  };
}

export interface HistogramAgg {
  histogram: {
    field: EsFieldName;
    interval: string;
  };
}

export interface DateHistogramAgg {
  date_histogram: {
    field: EsFieldName;
    calendar_interval: string;
  };
}

export type PivotGroupBy = GenericAgg | TermsAgg | HistogramAgg | DateHistogramAgg;
export type PivotGroupByDict = Dictionary<PivotGroupBy>;

export function getEsAggFromGroupByConfig(groupByConfig: GroupByConfigBase): GenericAgg {
  const { agg, aggName, dropDownName, ...esAgg } = groupByConfig;

  return {
    [agg]: esAgg,
  };
}
