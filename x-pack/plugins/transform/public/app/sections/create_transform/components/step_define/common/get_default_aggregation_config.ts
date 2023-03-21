/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTermsAggConfig } from './terms_agg';
import { EsFieldName } from '../../../../../../../common/types/fields';
import {
  PivotSupportedAggs,
  PIVOT_SUPPORTED_AGGS,
} from '../../../../../../../common/types/pivot_aggs';
import { PivotAggsConfigWithUiSupport } from '../../../../../common';
import { getFilterAggConfig } from './filter_agg/config';
import { getPercentilesAggConfig } from './percentiles_agg';
import { getTopMetricsAggConfig } from './top_metrics_agg';

/**
 * Provides a configuration based on the aggregation type.
 */
export function getDefaultAggregationConfig(
  aggName: string,
  dropDownName: string,
  fieldName: EsFieldName,
  agg: PivotSupportedAggs
): PivotAggsConfigWithUiSupport {
  const commonConfig = {
    agg,
    aggName,
    dropDownName,
    field: fieldName,
  };

  switch (agg) {
    case PIVOT_SUPPORTED_AGGS.PERCENTILES:
      return getPercentilesAggConfig(commonConfig);
    case PIVOT_SUPPORTED_AGGS.FILTER:
      return getFilterAggConfig(commonConfig);
    case PIVOT_SUPPORTED_AGGS.TOP_METRICS:
      return getTopMetricsAggConfig({
        ...commonConfig,
        // top_metrics agg has different naming convention by default
        aggName: PIVOT_SUPPORTED_AGGS.TOP_METRICS,
      });
    case PIVOT_SUPPORTED_AGGS.TERMS:
      return getTermsAggConfig(commonConfig);
    default:
      return commonConfig;
  }
}
