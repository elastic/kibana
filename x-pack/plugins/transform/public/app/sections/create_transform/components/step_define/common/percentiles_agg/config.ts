/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PercentilesAggForm } from './percentiles_form_component';
import type { IPivotAggsConfigPercentiles, PercentilesAggConfig, ValidationResult } from './types';
import type { PivotAggsConfigBase } from '../../../../../../common';
import {
  isPivotAggsConfigWithUiBase,
  PERCENTILES_AGG_DEFAULT_PERCENTS,
} from '../../../../../../common';
import type { PivotAggsConfigWithUiBase } from '../../../../../../common/pivot_aggs';

function validatePercentsInput(config: Partial<PercentilesAggConfig>): ValidationResult {
  const allValues = [...(config.percents ?? [])];
  // Combine existing percents with pending input for validation
  if (config.pendingPercentileInput) {
    // Replace comma with dot before converting to number
    const normalizedInput = config.pendingPercentileInput.replace(',', '.');
    const pendingValue = Number(normalizedInput);
    allValues.push(pendingValue);
  }

  if (allValues.length === 0) {
    return {
      isValid: false,
    };
  }

  if (allValues.some((value) => isNaN(value))) {
    return {
      isValid: false,
      errorType: 'INVALID_FORMAT',
    };
  }
  if (allValues.some((value) => value < 0 || value > 100)) {
    return {
      isValid: false,
      errorType: 'PERCENTILE_OUT_OF_RANGE',
    };
  }

  return { isValid: true };
}

export function getPercentilesAggConfig(
  commonConfig: PivotAggsConfigWithUiBase | PivotAggsConfigBase
): IPivotAggsConfigPercentiles {
  const field = isPivotAggsConfigWithUiBase(commonConfig) ? commonConfig.field : null;

  return {
    ...commonConfig,
    isSubAggsSupported: false,
    isMultiField: false,
    AggFormComponent: PercentilesAggForm,
    field,
    aggConfig: {
      percents: PERCENTILES_AGG_DEFAULT_PERCENTS,
    },
    setUiConfigFromEs(esAggDefinition) {
      const { field: esField, percents } = esAggDefinition;

      this.field = esField;
      this.aggConfig.percents = percents;
    },
    getEsAggConfig() {
      if (!this.isValid()) {
        return null;
      }

      return {
        field: this.field as string,
        percents: this.aggConfig.percents ?? [],
      };
    },
    isValid() {
      const validationResult = validatePercentsInput(this.aggConfig);
      this.errorMessageType = validationResult.errorType;
      return validationResult.isValid;
    },
  };
}
