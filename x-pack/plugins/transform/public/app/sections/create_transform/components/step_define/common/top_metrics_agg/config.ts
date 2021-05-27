/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isPivotAggsConfigWithUiSupport,
  PivotAggsConfigBase,
  PivotAggsConfigWithUiBase,
} from '../../../../../../common/pivot_aggs';
import { PivotAggsConfigTopMetrics } from './types';
import { TopMetricsAggForm } from './components/top_metrics_agg_form';

/**
 * Gets initial basic configuration of the top_metrics aggregation.
 */
export function getTopMetricsAggConfig(
  commonConfig: PivotAggsConfigWithUiBase | PivotAggsConfigBase
): PivotAggsConfigTopMetrics {
  return {
    ...commonConfig,
    isSubAggsSupported: false,
    field: isPivotAggsConfigWithUiSupport(commonConfig) ? commonConfig.field : '',
    AggFormComponent: TopMetricsAggForm,
    aggConfig: {},
    getEsAggConfig() {},
    setUiConfigFromEs(esAggDefinition) {},
    isValid() {
      return true;
    },
  };
}
