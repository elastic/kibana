/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EsFieldName,
  PERCENTILES_AGG_DEFAULT_PERCENTS,
  PivotAggsConfigWithUiSupport,
  PIVOT_SUPPORTED_AGGS,
} from '../../../../../common';

export function getDefaultAggregationConfig(
  aggName: string,
  dropDownName: string,
  fieldName: EsFieldName,
  agg: PIVOT_SUPPORTED_AGGS
): PivotAggsConfigWithUiSupport {
  switch (agg) {
    case PIVOT_SUPPORTED_AGGS.PERCENTILES:
      return {
        agg,
        aggName,
        dropDownName,
        field: fieldName,
        percents: PERCENTILES_AGG_DEFAULT_PERCENTS,
      };
    default:
      return {
        agg,
        aggName,
        dropDownName,
        field: fieldName,
      };
  }
}
