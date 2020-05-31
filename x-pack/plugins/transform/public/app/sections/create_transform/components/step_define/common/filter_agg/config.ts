/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PivotAggsConfigWithUiBase } from '../../../../../../common/pivot_aggs';
import { FilterAggType, FILTERS } from './constants';
import { FilterAggForm, FilterEditorForm, FilterRangeForm, FilterTermForm } from './components';
import {
  FilterAggConfigRange,
  FilterAggConfigTerm,
  FilterAggConfigUnion,
  PivotAggsConfigFilterInit,
} from './types';

/**
 * Gets initial basic configuration of the filter aggregation.
 */
export function getFilterAggConfig(
  commonConfig: PivotAggsConfigWithUiBase
): PivotAggsConfigFilterInit {
  return {
    ...commonConfig,
    AggFormComponent: FilterAggForm,
    aggConfig: {},
    getEsAggConfig() {
      // ensure the configuration has been completed
      if (!this.isValid!()) {
        return null;
      }
      const esAgg = this.aggConfig.aggTypeConfig?.getEsAggConfig(this.field);
      return {
        [this.aggConfig.filterAgg as string]: esAgg,
      };
    },
    setUiConfigFromEs(esAggDefinition) {
      const filterAgg = Object.keys(esAggDefinition)[0] as FilterAggType;
      const filterAggConfig = esAggDefinition[filterAgg];
      const aggTypeConfig = getFilterAggTypeConfig(filterAgg, filterAggConfig);

      this.field = Object.keys(filterAggConfig)[0];
      this.aggConfig = {
        filterAgg,
        aggTypeConfig,
      };
    },
    updateAggConfig(update) {
      this.aggConfig = {
        ...this.aggConfig,
        ...update,
      };
    },
    isValid() {
      return this.aggConfig.filterAgg !== undefined && this.aggConfig.aggTypeConfig.isValid();
    },
  };
}

/**
 * Returns a form component for provided filter aggregation type.
 */
export function getFilterAggTypeConfig(
  filterAggType?: FilterAggType,
  config?: { [key: string]: any }
): FilterAggConfigUnion['aggTypeConfig'] {
  switch (filterAggType) {
    case FILTERS.TERM:
      const value = typeof config === 'object' ? Object.values(config)[0] : undefined;

      return {
        FilterAggFormComponent: FilterTermForm,
        filterAggConfig: {
          value,
        },
        setUiConfigFromEs() {},
        getEsAggConfig(fieldName) {
          if (fieldName === undefined || !this.filterAggConfig) {
            throw new Error('Config is not completed');
          }
          return {
            [fieldName]: this.filterAggConfig.value,
          };
        },
        isValid() {
          return this.filterAggConfig?.value !== undefined;
        },
      } as FilterAggConfigTerm['aggTypeConfig'];
    case FILTERS.RANGE:
      return {
        FilterAggFormComponent: FilterRangeForm,
        setUiConfigFromEs() {},
        getEsAggConfig() {
          return {};
        },
      } as FilterAggConfigRange['aggTypeConfig'];
    default:
      return {
        FilterAggFormComponent: FilterEditorForm,
        setUiConfigFromEs() {},
        getEsAggConfig() {
          return {};
        },
      };
  }
}
