/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KBN_FIELD_TYPES } from '@kbn/data-plugin/common';
import { AggName } from '../../../common/types/aggregations';
import { Dictionary } from '../../../common/types/common';
import { EsFieldName } from '../../../common/types/fields';
import { GenericAgg } from '../../../common/types/pivot_group_by';
import { isPopulatedObject } from '../../../common/shared_imports';
import { PivotAggsConfigWithUiSupport } from './pivot_aggs';

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
  missing_bucket?: boolean;
}

interface GroupByHistogram extends GroupByConfigBase {
  agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM;
  field: EsFieldName;
  interval: string;
  missing_bucket?: boolean;
}

interface GroupByTerms extends GroupByConfigBase {
  agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS;
  field: EsFieldName;
  missing_bucket?: boolean;
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

export function isGroupByDateHistogram(arg: unknown): arg is GroupByDateHistogram {
  return (
    isPopulatedObject(arg, ['agg', 'field', 'calendar_interval']) &&
    arg.agg === PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM
  );
}

export function isGroupByHistogram(arg: unknown): arg is GroupByHistogram {
  return (
    isPopulatedObject(arg, ['agg', 'field', 'interval']) &&
    arg.agg === PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM
  );
}

export function isGroupByTerms(arg: unknown): arg is GroupByTerms {
  return (
    isPopulatedObject(arg, ['agg', 'field']) && arg.agg === PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS
  );
}

export function isPivotGroupByConfigWithUiSupport(arg: unknown): arg is GroupByConfigWithUiSupport {
  return isGroupByDateHistogram(arg) || isGroupByHistogram(arg) || isGroupByTerms(arg);
}

export function getEsAggFromGroupByConfig(groupByConfig: GroupByConfigBase): GenericAgg {
  const { agg, aggName, dropDownName, ...esAgg } = groupByConfig;

  return {
    [agg]: esAgg,
  };
}

export function isPivotAggConfigWithUiSupport(arg: unknown): arg is PivotAggsConfigWithUiSupport {
  return isPopulatedObject(arg, ['agg', 'field']);
}
