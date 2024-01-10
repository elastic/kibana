/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  isPivotAggsConfigWithUiBase,
  isSpecialSortField,
  isValidSortDirection,
  isValidSortMode,
  isValidSortNumericType,
  PivotAggsConfigBase,
  PivotAggsConfigWithUiBase,
} from '../../../../../../common/pivot_aggs';
import type { PivotAggsConfigTopMetrics, PivotAggsUtilsTopMetrics } from './types';

export function getTopMetricsAggUtils(config: PivotAggsConfigTopMetrics): PivotAggsUtilsTopMetrics {
  return {
    getEsAggConfig() {
      // ensure the configuration has been completed
      if (!this.isValid()) {
        return null;
      }

      const { sortField, sortSettings = {}, ...unsupportedConfig } = config.aggConfig;

      let sort = null;

      if (isSpecialSortField(sortField)) {
        sort = sortField;
      } else {
        const { mode, numericType, order, ...rest } = sortSettings;

        if (mode || numericType || isPopulatedObject(rest)) {
          sort = {
            [sortField!]: {
              ...rest,
              order,
              ...(mode ? { mode } : {}),
              ...(numericType ? { numeric_type: numericType } : {}),
            },
          };
        } else {
          sort = { [sortField!]: sortSettings.order as estypes.SortOrder };
        }
      }

      return {
        metrics: (Array.isArray(config.field) ? config.field : [config.field]).map((f) => ({
          field: f as string,
        })),
        sort: sort!,
        ...(unsupportedConfig ?? {}),
      };
    },
    setUiConfigFromEs(esAggDefinition) {
      const { metrics, sort, ...unsupportedConfig } = esAggDefinition;

      config.field = (Array.isArray(metrics) ? metrics : [metrics]).map((v) => v!.field);

      if (isSpecialSortField(sort)) {
        config.aggConfig.sortField = sort;
        return;
      }

      if (!sort) {
        config.aggConfig = {
          ...config.aggConfig,
          ...(unsupportedConfig ?? {}),
        };

        return;
      }

      const sortField = Object.keys(sort)[0];

      config.aggConfig.sortField = sortField;

      const sortDefinition = sort[sortField];

      config.aggConfig.sortSettings = config.aggConfig.sortSettings ?? {};

      if (isValidSortDirection(sortDefinition)) {
        config.aggConfig.sortSettings.order = sortDefinition;
      }

      if (isPopulatedObject(sortDefinition)) {
        const { order, mode, numeric_type: numType, ...rest } = sortDefinition;
        config.aggConfig.sortSettings = rest;

        if (isValidSortDirection(order)) {
          config.aggConfig.sortSettings.order = order;
        }
        if (isValidSortMode(mode)) {
          config.aggConfig.sortSettings.mode = mode;
        }
        if (isValidSortNumericType(numType)) {
          config.aggConfig.sortSettings.numericType = numType;
        }
      }

      config.aggConfig = {
        ...config.aggConfig,
        ...(unsupportedConfig ?? {}),
      };
    },
    isValid() {
      return (
        !!config.aggConfig.sortField &&
        (isSpecialSortField(config.aggConfig.sortField)
          ? true
          : !!config.aggConfig.sortSettings?.order)
      );
    },
  };
}

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
    field: isPivotAggsConfigWithUiBase(commonConfig) ? commonConfig.field : '',
    aggFormComponent: 'top_metrics',
    aggConfig: {},
  };
}
