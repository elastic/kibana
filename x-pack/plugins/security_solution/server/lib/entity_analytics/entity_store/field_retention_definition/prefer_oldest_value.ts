/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseFieldRetentionOperator, FieldRetentionOperatorBuilder } from './types';
import { isFieldMissingOrEmpty } from '../painless';

export interface PreferOldestValue extends BaseFieldRetentionOperator {
  operation: 'prefer_oldest_value';
}

/**
 * A field retention operator that prefers the oldest value of the specified field.
 * If the historical field is missing or empty, the latest value is used.
 */
export const preferOldestValueProcessor: FieldRetentionOperatorBuilder<PreferOldestValue> = (
  { field },
  { enrichField }
) => {
  const historicalField = `${enrichField}.${field}`;
  return {
    set: {
      if: `!(${isFieldMissingOrEmpty(`ctx.${historicalField}`)})`,
      field,
      value: `{{${historicalField}}}`,
    },
  };
};
