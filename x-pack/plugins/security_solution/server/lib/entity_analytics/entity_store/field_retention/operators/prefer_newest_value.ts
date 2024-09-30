/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseFieldRetentionOperator, FieldRetentionOperatorBuilder } from './types';
import { isFieldMissingOrEmpty } from '../painless_utils';

export interface PreferNewestValue extends BaseFieldRetentionOperator {
  operation: 'prefer_newest_value';
}

export const preferNewestValueProcessor: FieldRetentionOperatorBuilder<PreferNewestValue> = (
  { field },
  { enrichField }
) => {
  const fullEnrichField = `${enrichField}.${field}`;
  return {
    set: {
      if: `${isFieldMissingOrEmpty(`ctx.${field}`)} && !(${isFieldMissingOrEmpty(
        `ctx.${fullEnrichField}`
      )})`,
      field,
      value: `{{${fullEnrichField}}}`,
    },
  };
};
