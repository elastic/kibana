/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IPivotAggsConfigPercentiles, IPivotAggsUtilsPercentiles } from './types';
import {
  isPivotAggsConfigWithUiBase,
  PERCENTILES_AGG_DEFAULT_PERCENTS,
  PivotAggsConfigBase,
} from '../../../../../../common';
import { PivotAggsConfigWithUiBase } from '../../../../../../common/pivot_aggs';

/**
 * TODO this callback has been moved.
 * The logic of parsing the string should be improved.
 */
function parsePercentsInput(inputValue: string | undefined) {
  if (inputValue !== undefined) {
    const strVals: string[] = inputValue.split(',');
    const percents: number[] = [];
    for (const str of strVals) {
      if (str.trim().length > 0 && isNaN(str as any) === false) {
        const val = Number(str);
        if (val >= 0 && val <= 100) {
          percents.push(val);
        } else {
          return [];
        }
      }
    }

    return percents;
  }

  return [];
}

// Input string should only include comma separated numbers
function isValidPercentsInput(inputValue: string) {
  return /^[0-9]+(,[0-9]+)*$/.test(inputValue);
}

export const getPercentilesAggUtils = (
  config: IPivotAggsConfigPercentiles
): IPivotAggsUtilsPercentiles => {
  return {
    setUiConfigFromEs(esAggDefinition) {
      const { field: esField, percents } = esAggDefinition;

      config.field = esField;
      config.aggConfig.percents = percents.join(',');
    },
    getEsAggConfig() {
      if (!this.isValid()) {
        return null;
      }

      return {
        field: config.field as string,
        percents: parsePercentsInput(config.aggConfig.percents),
      };
    },
    isValid() {
      return (
        typeof config.aggConfig.percents === 'string' &&
        isValidPercentsInput(config.aggConfig.percents)
      );
    },
  };
};

export function getPercentilesAggConfig(
  commonConfig: PivotAggsConfigWithUiBase | PivotAggsConfigBase
): IPivotAggsConfigPercentiles {
  const field = isPivotAggsConfigWithUiBase(commonConfig) ? commonConfig.field : null;

  return {
    ...commonConfig,
    isSubAggsSupported: false,
    isMultiField: false,
    aggFormComponent: 'percentiles',
    field,
    aggConfig: {
      percents: PERCENTILES_AGG_DEFAULT_PERCENTS.toString(),
    },
  };
}
