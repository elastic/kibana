/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PivotSupportedAggs } from '../../../../../common/pivot_aggs';
import { getFilterAggConfig } from './filter_agg_config';

/**
 * Gets form configuration for provided aggregation type.
 */
export function getAggFormConfig(agg: PivotSupportedAggs) {
  switch (agg) {
    case 'filter':
      return getFilterAggConfig();
    default:
      return;
  }
}
