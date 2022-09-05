/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TermsAggForm } from './terms_form_component';
import {
  isPivotAggsConfigWithUiBase,
  PivotAggsConfigBase,
  PivotAggsConfigWithUiBase,
  TERMS_AGG_DEFAULT_SIZE,
} from '../../../../../../common/pivot_aggs';
import { IPivotAggsConfigTerms } from './types';

export function getTermsAggConfig(
  commonConfig: PivotAggsConfigWithUiBase | PivotAggsConfigBase
): IPivotAggsConfigTerms {
  const field = isPivotAggsConfigWithUiBase(commonConfig) ? commonConfig.field : null;

  return {
    ...commonConfig,
    isSubAggsSupported: false,
    isMultiField: false,
    AggFormComponent: TermsAggForm,
    field,
    aggConfig: {
      size: TERMS_AGG_DEFAULT_SIZE,
    },
    setUiConfigFromEs(esAggDefinition) {
      const { field: esField, size } = esAggDefinition;

      this.field = esField;
      this.aggConfig.size = size;
    },
    getEsAggConfig() {
      if (!this.isValid()) {
        return null;
      }

      return {
        field: this.field as string,
        size: this.aggConfig.size as number,
      };
    },
    isValid() {
      return typeof this.aggConfig.size === 'number' && this.aggConfig.size > 0;
    },
  };
}
