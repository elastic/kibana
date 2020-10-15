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
    isSubAggsSupported: true,
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
    getAggName() {
      return this.aggConfig?.aggTypeConfig?.getAggName
        ? this.aggConfig.aggTypeConfig.getAggName()
        : undefined;
    },
    helperText() {
      return this.aggConfig?.aggTypeConfig?.helperText
        ? this.aggConfig.aggTypeConfig.helperText()
        : undefined;
    },
  };
}

/**
 * Returns a form component for provided filter aggregation type.
 */
export function getFilterAggTypeConfig(
  filterAggType: FilterAggConfigUnion['filterAgg'] | FilterAggType,
  esConfig?: { [key: string]: any }
): FilterAggConfigUnion['aggTypeConfig'] | FilterAggConfigBase['aggTypeConfig'] {
  switch (filterAggType) {
    case FILTERS.TERM:
      const value = typeof esConfig === 'object' ? Object.values(esConfig)[0] : undefined;

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
        getAggName() {
          return this.filterAggConfig?.value ? this.filterAggConfig.value : undefined;
        },
      } as FilterAggConfigTerm['aggTypeConfig'];
    case FILTERS.RANGE:
      const esFilterRange = typeof esConfig === 'object' ? Object.values(esConfig)[0] : undefined;

      return {
        FilterAggFormComponent: FilterRangeForm,
        filterAggConfig:
          typeof esFilterRange === 'object'
            ? {
                from: esFilterRange.gte ?? esFilterRange.gt,
                to: esFilterRange.lte ?? esFilterRange.lt,
                includeFrom: esFilterRange.gte !== undefined,
                includeTo: esFilterRange.lts !== undefined,
              }
            : undefined,
        getEsAggConfig(fieldName) {
          if (fieldName === undefined || !this.filterAggConfig) {
            throw new Error(`Config ${FILTERS.RANGE} is not completed`);
          }

          const { from, includeFrom, to, includeTo } = this.filterAggConfig;
          const result = {} as ReturnType<
            FilterAggConfigRange['aggTypeConfig']['getEsAggConfig']
          >[0];

          if (from) {
            result[includeFrom ? 'gte' : 'gt'] = from;
          }
          if (to) {
            result[includeTo ? 'lte' : 'lt'] = to;
          }

          return {
            [fieldName]: result,
          };
        },
        isValid() {
          if (
            typeof this.filterAggConfig !== 'object' ||
            (this.filterAggConfig.from === undefined && this.filterAggConfig.to === undefined)
          ) {
            return false;
          }

          if (this.filterAggConfig.from !== undefined && this.filterAggConfig.to !== undefined) {
            return this.filterAggConfig.from <= this.filterAggConfig.to;
          }

          return true;
        },
        helperText() {
          if (!this.isValid!()) return;
          const { from, to, includeFrom, includeTo } = this.filterAggConfig!;

          return `range: ${`${from !== undefined ? `${includeFrom ? '≥' : '>'} ${from}` : ''} ${
            from !== undefined && to !== undefined ? '&' : ''
          } ${to !== undefined ? `${includeTo ? '≤' : '<'} ${to}` : ''}`.trim()}`;
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
