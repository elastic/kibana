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
    isMultiField: true,
    field: isPivotAggsConfigWithUiSupport(commonConfig) ? commonConfig.field : '',
    AggFormComponent: TopMetricsAggForm,
    aggConfig: {},
    getEsAggConfig() {
      // ensure the configuration has been completed
      if (!this.isValid()) {
        return null;
      }

      return {
        metrics: (Array.isArray(this.field) ? this.field : [this.field]).map((f) => ({ field: f })),
        sort: { [this.aggConfig.sortField!]: this.aggConfig.sortDirection },
      };
    },
    setUiConfigFromEs(esAggDefinition) {
      const { metrics, sort } = esAggDefinition;

      this.field = (Array.isArray(metrics) ? metrics : [metrics]).map((v) => v.field);

      if (sort === '_score' || esAggDefinition.sort === '_doc') {
        // special field names
        this.field = esAggDefinition.sort;
        return;
      }

      this.aggConfig = {};
    },
    isValid() {
      return this.aggConfig.sortField !== undefined && this.aggConfig.sortDirection !== undefined;
    },
  };
}
