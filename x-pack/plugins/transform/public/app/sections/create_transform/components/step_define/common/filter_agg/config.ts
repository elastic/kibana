/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isJsonString } from '../../../../../../common/validators';
import {
  isPivotAggsConfigWithUiBase,
  PivotAggsConfigBase,
  PivotAggsConfigWithUiBase,
} from '../../../../../../common/pivot_aggs';
import { FILTERS } from './constants';
import {
  isFilterAggConfigTerm,
  isFilterAggConfigRange,
  isFilterAggConfigExists,
  isFilterAggConfigBool,
  isFilterAggConfigEditor,
  type FilterAggConfigBool,
  type FilterAggConfigExists,
  type FilterAggConfigRange,
  type FilterAggConfigTerm,
  type FilterAggConfigEditor,
  type FilterAggConfigUnion,
  type FilterAggType,
  type FilterAggUtilsUnion,
  type FilterAggUtilsTerm,
  type FilterAggUtilsRange,
  type FilterAggUtilsExists,
  type FilterAggUtilsBool,
  type FilterAggUtilsEditor,
  type PivotAggsConfigFilter,
  type PivotAggsUtilsFilter,
} from './types';

import { FilterTermForm, FilterEditorForm, FilterRangeForm } from './components';

export const getFilterAggUtils = (config: PivotAggsConfigFilter): PivotAggsUtilsFilter => {
  return {
    getEsAggConfig() {
      // ensure the configuration has been completed
      if (!this.isValid()) {
        return null;
      }
      const utils = getFilterAggTypeUtils(config.aggConfig.aggTypeConfig);
      const esAgg = utils?.getEsAggConfig() ?? null;
      return {
        [config.aggConfig.filterAgg as string]: esAgg,
      };
    },
    setUiConfigFromEs(esAggDefinition) {
      const filterAgg = Object.keys(esAggDefinition)[0] as FilterAggType;
      // @ts-ignore conflicts with a union type
      const filterAggConfig = esAggDefinition[filterAgg];

      const aggTypeConfig = getFilterAggTypeConfig(
        filterAgg,
        config.field as string,
        filterAggConfig
      );

      config.field = config.field ?? aggTypeConfig.fieldName ?? null;

      config.aggConfig = {
        filterAgg,
        aggTypeConfig,
      };
    },
    isValid() {
      return (
        config.aggConfig?.filterAgg !== undefined &&
        (config.aggConfig.aggTypeConfig?.isValid ? config.aggConfig.aggTypeConfig.isValid() : true)
      );
    },
    getAggName() {
      return config.aggConfig?.aggTypeConfig?.getAggName
        ? config.aggConfig.aggTypeConfig.getAggName()
        : undefined;
    },
    helperText() {
      return config.aggConfig?.aggTypeConfig?.helperText
        ? config.aggConfig.aggTypeConfig.helperText()
        : undefined;
    },
  };
};

/**
 * Gets initial basic configuration of the filter aggregation.
 */
export function getFilterAggConfig(
  commonConfig: PivotAggsConfigWithUiBase | PivotAggsConfigBase
): PivotAggsConfigFilter {
  const field = isPivotAggsConfigWithUiBase(commonConfig) ? commonConfig.field : null;

  return {
    ...commonConfig,
    isSubAggsSupported: true,
    // Field name might be missing, for instance for the bool filter.
    field,
    aggFormComponent: 'filter',
    aggConfig: {},
  };
}

export function getFilterAggTypeUtils(
  aggTypeConfig: FilterAggConfigUnion['aggTypeConfig']
): FilterAggUtilsUnion | undefined {
  if (isFilterAggConfigTerm(aggTypeConfig)) {
    const termUtils: FilterAggUtilsTerm = {
      getEsAggConfig() {
        if (aggTypeConfig.fieldName === undefined || !aggTypeConfig.filterAggConfig) {
          throw new Error(`Config ${FILTERS.TERM} is not completed`);
        }
        return {
          [aggTypeConfig.fieldName]: aggTypeConfig.filterAggConfig.value,
        };
      },
      isValid() {
        return aggTypeConfig.filterAggConfig?.value !== undefined;
      },
      getAggName() {
        return aggTypeConfig.filterAggConfig?.value
          ? aggTypeConfig.filterAggConfig.value
          : undefined;
      },
    };
    return termUtils;
  } else if (isFilterAggConfigRange(aggTypeConfig)) {
    const rangeUtils: FilterAggUtilsRange = {
      getEsAggConfig() {
        if (aggTypeConfig.fieldName === undefined || !aggTypeConfig.filterAggConfig) {
          throw new Error(`Config ${FILTERS.RANGE} is not completed`);
        }

        const { from, includeFrom, to, includeTo } = aggTypeConfig.filterAggConfig;
        const result = {} as ReturnType<FilterAggUtilsRange['getEsAggConfig']>[0];

        if (from) {
          result[includeFrom ? 'gte' : 'gt'] = from;
        }
        if (to) {
          result[includeTo ? 'lte' : 'lt'] = to;
        }

        return {
          [aggTypeConfig.fieldName]: result,
        };
      },
      isValid() {
        if (
          typeof aggTypeConfig.filterAggConfig !== 'object' ||
          (aggTypeConfig.filterAggConfig.from === undefined &&
            aggTypeConfig.filterAggConfig.to === undefined)
        ) {
          return false;
        }

        if (
          aggTypeConfig.filterAggConfig.from !== undefined &&
          aggTypeConfig.filterAggConfig.to !== undefined
        ) {
          return aggTypeConfig.filterAggConfig.from <= aggTypeConfig.filterAggConfig.to;
        }

        return true;
      },
      helperText() {
        if (!this.isValid!()) return;
        const { from, to, includeFrom, includeTo } = aggTypeConfig.filterAggConfig!;

        return `range: ${`${from !== undefined ? `${includeFrom ? '≥' : '>'} ${from}` : ''} ${
          from !== undefined && to !== undefined ? '&' : ''
        } ${to !== undefined ? `${includeTo ? '≤' : '<'} ${to}` : ''}`.trim()}`;
      },
    };
    return rangeUtils;
  } else if (isFilterAggConfigExists(aggTypeConfig)) {
    const existsUtils: FilterAggUtilsExists = {
      getEsAggConfig() {
        if (aggTypeConfig.fieldName === undefined) {
          throw new Error(`Config ${FILTERS.EXISTS} is not completed`);
        }
        return {
          field: aggTypeConfig.fieldName,
        };
      },
      isValid() {
        return typeof aggTypeConfig.fieldName === 'string';
      },
    };
    return existsUtils;
  } else if (isFilterAggConfigBool(aggTypeConfig)) {
    const boolUtils: FilterAggUtilsBool = {
      getEsAggConfig() {
        return JSON.parse(aggTypeConfig.filterAggConfig!);
      },
      isValid() {
        return isJsonString(aggTypeConfig.filterAggConfig);
      },
    };
    return boolUtils;
  } else if (isFilterAggConfigEditor(aggTypeConfig)) {
    const editorUtils: FilterAggUtilsEditor = {
      getEsAggConfig() {
        return aggTypeConfig.filterAggConfig !== undefined
          ? JSON.parse(aggTypeConfig.filterAggConfig!)
          : {};
      },
      isValid() {
        return isJsonString(aggTypeConfig.filterAggConfig);
      },
    };
    return editorUtils;
  }
}

export function getFilterAggTypeComponent(aggTypeConfig: FilterAggConfigUnion['aggTypeConfig']) {
  if (isFilterAggConfigTerm(aggTypeConfig)) {
    return FilterTermForm;
  } else if (isFilterAggConfigRange(aggTypeConfig)) {
    return FilterRangeForm;
  } else if (isFilterAggConfigExists(aggTypeConfig)) {
    return FilterEditorForm;
  } else if (isFilterAggConfigBool(aggTypeConfig)) {
    return FilterEditorForm;
  } else if (isFilterAggConfigEditor(aggTypeConfig)) {
    return FilterEditorForm;
  }
}

/**
 * Returns a form component for provided filter aggregation type.
 */
export function getFilterAggTypeConfig(
  filterAggType: FilterAggConfigUnion['filterAgg'] | FilterAggType,
  fieldName?: string,
  esConfig?: { [key: string]: any }
): FilterAggConfigUnion['aggTypeConfig'] {
  let resultField = fieldName;

  switch (filterAggType) {
    case FILTERS.TERM:
      const value = typeof esConfig === 'object' ? Object.values(esConfig)[0] : undefined;

      resultField = esConfig ? Object.keys(esConfig)[0] : resultField;

      return {
        filterAggFormComponent: 'filterTermForm',
        filterAggConfig: {
          value,
        },
        fieldName: resultField,
      } as FilterAggConfigTerm['aggTypeConfig'];
    case FILTERS.RANGE:
      resultField = esConfig ? Object.keys(esConfig)[0] : resultField;

      const esFilterRange = typeof esConfig === 'object' ? Object.values(esConfig)[0] : undefined;

      return {
        fieldName: resultField,
        filterAggFormComponent: 'filterRangeForm',
        filterAggConfig:
          typeof esFilterRange === 'object'
            ? {
                from: esFilterRange.gte ?? esFilterRange.gt,
                to: esFilterRange.lte ?? esFilterRange.lt,
                includeFrom: esFilterRange.gte !== undefined,
                includeTo: esFilterRange.lte !== undefined,
              }
            : undefined,
      } as FilterAggConfigRange['aggTypeConfig'];
    case FILTERS.EXISTS:
      resultField = esConfig ? esConfig.field : resultField;

      return {
        filterAggFormComponent: 'filterExistsForm',
        fieldName: resultField,
      } as FilterAggConfigExists['aggTypeConfig'];
    case FILTERS.BOOL:
      return {
        filterAggFormComponent: 'filterBoolForm',
        filterAggConfig: JSON.stringify(
          {
            must: [],
            must_not: [],
            should: [],
          },
          null,
          2
        ),
      } as FilterAggConfigBool['aggTypeConfig'];
    default:
      return {
        fieldName,
        filterAggFormComponent: 'filterEditorForm',
        filterAggConfig: '',
      } as FilterAggConfigEditor['aggTypeConfig'];
  }
}
