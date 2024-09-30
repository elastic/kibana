/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { BaseFieldRetentionOperator } from './types';
import { ENRICH_FIELD } from '../constants';
import { isFieldMissingOrEmpty } from '../painless_utils';

export interface PreferOldestValue extends BaseFieldRetentionOperator {
  operation: 'prefer_oldest_value';
}

export const preferOldestValueProcessor = ({
  field,
}: PreferOldestValue): IngestProcessorContainer => {
  const historicalField = `ctx.${ENRICH_FIELD}.${field}`;
  return {
    set: {
      if: `!(${isFieldMissingOrEmpty(historicalField)})`,
      field,
      value: `{{${historicalField}}}`,
    },
  };
};
