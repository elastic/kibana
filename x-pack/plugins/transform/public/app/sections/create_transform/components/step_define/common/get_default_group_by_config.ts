/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsFieldName } from '../../../../../../../common/types/fields';

import type { GroupByConfigWithUiSupport } from '../../../../../common';
import { PIVOT_SUPPORTED_GROUP_BY_AGGS } from '../../../../../common';

export function getDefaultGroupByConfig(
  aggName: string,
  dropDownName: string,
  fieldName: EsFieldName,
  groupByAgg: PIVOT_SUPPORTED_GROUP_BY_AGGS
): GroupByConfigWithUiSupport {
  switch (groupByAgg) {
    case PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS:
      return {
        agg: groupByAgg,
        aggName,
        dropDownName,
        field: fieldName,
      };
    case PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM:
      return {
        agg: groupByAgg,
        aggName,
        dropDownName,
        field: fieldName,
        interval: '10',
      };
    case PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM:
      return {
        agg: groupByAgg,
        aggName,
        dropDownName,
        field: fieldName,
        calendar_interval: '1m',
      };
  }
}
