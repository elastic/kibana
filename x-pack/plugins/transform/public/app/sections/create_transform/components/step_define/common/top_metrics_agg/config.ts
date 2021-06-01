/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isPivotAggsConfigWithUiSupport,
  isSpecialSortField,
  isValidSortDirection,
  isValidSortMode,
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

      const { sortField, sortDirection, sortMode } = this.aggConfig;

      let sort = null;

      if (isSpecialSortField(sortField)) {
        sort = sortField;
      } else {
        if (sortMode) {
          sort = {
            [sortField!]: {
              order: sortDirection,
              mode: sortMode,
            },
          };
        } else {
          sort = { [sortField!]: sortDirection };
        }
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

      const sortField = Object.keys(sort)[0];
      const sortDefinition = sort[sortField];

      let sortDirection = null;
      let sortMode = null;

      if (isValidSortDirection(sortDefinition)) {
        sortDirection = sortDefinition;
      }

      if (typeof sortDefinition === 'object') {
        if (isValidSortDirection(sortDefinition.order)) {
          sortDirection = sortDefinition.order;
        }
        if (isValidSortMode(sortDefinition.mode)) {
          sortMode = sortDefinition.mode;
        }
      }

      this.aggConfig = {
        sortField,
        sortDirection,
        ...(sortMode ? { sortMode } : {}),
      };
    },
    isValid() {
      return this.aggConfig.sortField !== undefined;
    },
  };
}
