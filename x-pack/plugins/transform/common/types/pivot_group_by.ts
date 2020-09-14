/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dictionary } from './common';
import { EsFieldName } from './fields';

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
