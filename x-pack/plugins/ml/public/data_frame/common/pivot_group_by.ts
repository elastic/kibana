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
interface GroupByDateHistogram extends GroupByConfigBase {
  agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM;
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
