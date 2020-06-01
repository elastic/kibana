/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  isPivotAggsConfigWithUiSupport,
  PivotAggsConfigBase,
  PivotAggsConfigWithUiBase,
} from '../../../../../../common/pivot_aggs';
import { FILTERS } from './constants';
import { FilterAggForm, FilterEditorForm, FilterRangeForm, FilterTermForm } from './components';
import {
  FilterAggConfigBase,
  FilterAggConfigBool,
  FilterAggConfigExists,
  FilterAggConfigRange,
  FilterAggConfigTerm,
  FilterAggConfigUnion,
  FilterAggType,
  PivotAggsConfigFilter,
} from './types';

/**
 * Gets initial basic configuration of the filter aggregation.
 */
export function getFilterAggConfig(
  commonConfig: PivotAggsConfigWithUiBase | PivotAggsConfigBase
): PivotAggsConfigFilter {
  return {
    ...commonConfig,
    field: isPivotAggsConfigWithUiSupport(commonConfig) ? commonConfig.field : '',
    AggFormComponent: FilterAggForm,
    aggConfig: {},
    getEsAggConfig() {
      // ensure the configuration has been completed
      if (!this.isValid()) {
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

      // TODO consider moving field to the filter agg type level
      this.field = Object.keys(filterAggConfig)[0];
      this.aggConfig = {
        filterAgg,
        aggTypeConfig,
      };
    },
    isValid() {
      return (
        this.aggConfig?.filterAgg !== undefined &&
        (this.aggConfig.aggTypeConfig?.isValid ? this.aggConfig.aggTypeConfig.isValid() : true)
      );
    },
  };
}

/**
 * Returns a form component for provided filter aggregation type.
 */
export function getFilterAggTypeConfig(
  filterAggType: FilterAggConfigUnion['filterAgg'] | FilterAggType,
  config?: { [key: string]: any }
): FilterAggConfigUnion['aggTypeConfig'] | FilterAggConfigBase['aggTypeConfig'] {
  switch (filterAggType) {
    case FILTERS.TERM:
      const value = typeof config === 'object' ? Object.values(config)[0] : undefined;

      return {
        FilterAggFormComponent: FilterTermForm,
        filterAggConfig: {
          value,
        },
        getEsAggConfig(fieldName) {
          if (fieldName === undefined || !this.filterAggConfig) {
            throw new Error(`Config ${FILTERS.TERM} is not completed`);
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
        filterAggConfig: typeof config === 'object' ? Object.values(config)[0] : undefined,
        getEsAggConfig(fieldName) {
          if (fieldName === undefined || !this.filterAggConfig) {
            throw new Error(`Config ${FILTERS.RANGE} is not completed`);
          }
          return {
            [fieldName]: this.filterAggConfig,
          };
        },
        isValid() {
          return (
            this.filterAggConfig &&
            Object.values(this.filterAggConfig).filter((v) => v !== undefined).length > 0
          );
        },
      } as FilterAggConfigRange['aggTypeConfig'];
    case FILTERS.EXISTS:
      return {
        getEsAggConfig(fieldName) {
          if (fieldName === undefined) {
            throw new Error(`Config ${FILTERS.EXISTS} is not completed`);
          }
          return {
            field: fieldName,
          };
        },
      } as FilterAggConfigExists['aggTypeConfig'];
    case FILTERS.BOOL:
      return {
        FilterAggFormComponent: FilterEditorForm,
        filterAggConfig: JSON.stringify(
          {
            must: [],
            must_not: [],
            should: [],
          },
          null,
          2
        ),
        getEsAggConfig(fieldName) {
          return JSON.parse(this.filterAggConfig!);
        },
      } as FilterAggConfigBool['aggTypeConfig'];
    default:
      return {
        FilterAggFormComponent: FilterEditorForm,
        filterAggConfig: '',
        getEsAggConfig() {
          return this.filterAggConfig !== undefined ? JSON.parse(this.filterAggConfig!) : {};
        },
      };
  }
}
