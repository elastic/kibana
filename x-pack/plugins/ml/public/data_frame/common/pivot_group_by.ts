/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dictionary } from '../../../common/types/common';

export enum PIVOT_SUPPORTED_GROUP_BY_AGGS {
  DATE_HISTOGRAM = 'date_histogram',
  HISTOGRAM = 'histogram',
  TERMS = 'terms',
}

type FieldName = string;

interface GroupByConfigBase {
  field: FieldName;
  formRowLabel: string;
}

export const histogramIntervalFormatRegex = /^[0-9]+((\.)?[0-9]+)?$/;
export const dateHistogramIntervalFormatRegex = /^[0-9]+(ms|s|m|h|d|w|M|q|y)$/;

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

export type PivotGroupByConfig = GroupByDateHistogram | GroupByHistogram | GroupByTerms;
export type PivotGroupByConfigDict = Dictionary<PivotGroupByConfig>;
