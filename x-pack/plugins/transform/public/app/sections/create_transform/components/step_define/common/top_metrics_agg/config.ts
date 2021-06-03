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
  isValidSortNumericType,
  PivotAggsConfigBase,
  PivotAggsConfigWithUiBase,
} from '../../../../../../common/pivot_aggs';
import { PivotAggsConfigTopMetrics } from './types';
import { TopMetricsAggForm } from './components/top_metrics_agg_form';
import { isPopulatedObject } from '../../../../../../../../common/shared_imports';

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

      const {
        sortField,
        sortDirection,
        sortMode,
        numericType,
        ...unsupportedConfig
      } = this.aggConfig;

      let sort = null;

      if (isSpecialSortField(sortField)) {
        sort = sortField;
      } else {
        if (sortMode || numericType || isPopulatedObject(unsupportedConfig)) {
          sort = {
            [sortField!]: {
              order: sortDirection,
              ...(sortMode ? { mode: sortMode } : {}),
              ...(numericType ? { numeric_type: numericType } : {}),
              ...(unsupportedConfig ?? {}),
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

      this.aggConfig.sortField = sortField;

      const sortDefinition = sort[sortField];

      let unsupportedConfig = null;

      if (isValidSortDirection(sortDefinition)) {
        this.aggConfig.sortDirection = sortDefinition;
      }

      if (isPopulatedObject(sortDefinition)) {
        const { order, mode, numeric_type: numType, ...rest } = sortDefinition;
        unsupportedConfig = rest;

        if (isValidSortDirection(order)) {
          this.aggConfig.sortDirection = order;
        }
        if (isValidSortMode(mode)) {
          this.aggConfig.sortMode = mode;
        }
        if (isValidSortNumericType(numType)) {
          this.aggConfig.numericType = numType;
        }
      }

      this.aggConfig = {
        ...this.aggConfig,
        ...(unsupportedConfig ?? {}),
      };
    },
    isValid() {
      return (
        !!this.aggConfig.sortField &&
        (isSpecialSortField(this.aggConfig.sortField) ? true : !!this.aggConfig.sortDirection)
      );
    },
  };
}
