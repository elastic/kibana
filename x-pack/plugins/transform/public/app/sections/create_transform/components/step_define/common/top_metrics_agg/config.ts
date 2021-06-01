/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isPivotAggsConfigWithUiSupport,
  isSpecialSortField,
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

      let sort = null;

      if (isSpecialSortField(this.aggConfig.sortField)) {
        sort = this.aggConfig.sortField;
      } else {
        sort = { [this.aggConfig.sortField!]: this.aggConfig.sortDirection };
      }

      return {
        metrics: (Array.isArray(this.field) ? this.field : [this.field]).map((f) => ({ field: f })),
        sort,
      };
    },
    setUiConfigFromEs(esAggDefinition) {
      const { metrics, sort } = esAggDefinition;

      this.field = (Array.isArray(metrics) ? metrics : [metrics]).map((v) => v.field);

      if (isSpecialSortField(sort)) {
        this.aggConfig.sortField = sort;
        return;
      }

      this.aggConfig = {
        sortField: Object.keys(sort)[0],
        sortDirection: Object.values(sort)[0]!,
      };
    },
    isValid() {
      return this.aggConfig.sortField !== undefined;
    },
  };
}
