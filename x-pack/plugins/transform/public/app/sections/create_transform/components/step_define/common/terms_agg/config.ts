/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isPivotAggsConfigWithUiBase,
  PivotAggsConfigBase,
  PivotAggsConfigWithUiBase,
  TERMS_AGG_DEFAULT_SIZE,
} from '../../../../../../common/pivot_aggs';
import type { IPivotAggsConfigTerms, IPivotAggsUtilsTerms } from './types';

export function getTermsAggUtils(config: IPivotAggsConfigTerms): IPivotAggsUtilsTerms {
  return {
    setUiConfigFromEs(esAggDefinition) {
      const { field: esField, size } = esAggDefinition;

      config.field = esField;
      config.aggConfig.size = size;
    },
    getEsAggConfig() {
      if (!this.isValid()) {
        return null;
      }

      return {
        field: config.field as string,
        size: config.aggConfig.size as number,
      };
    },
    isValid() {
      return typeof config.aggConfig.size === 'number' && config.aggConfig.size > 0;
    },
  };
}

export function getTermsAggConfig(
  commonConfig: PivotAggsConfigWithUiBase | PivotAggsConfigBase
): IPivotAggsConfigTerms {
  const field = isPivotAggsConfigWithUiBase(commonConfig) ? commonConfig.field : null;

  return {
    ...commonConfig,
    isSubAggsSupported: false,
    isMultiField: false,
    aggFormComponent: 'terms',
    field,
    aggConfig: {
      size: TERMS_AGG_DEFAULT_SIZE,
    },
  };
}
