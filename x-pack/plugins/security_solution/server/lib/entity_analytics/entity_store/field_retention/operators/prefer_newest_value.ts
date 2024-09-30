/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { BaseFieldRetentionOperator } from './types';
import { isFieldMissingOrEmpty } from '../painless_utils';
import { ENRICH_FIELD } from '../constants';

export interface PreferNewestValue extends BaseFieldRetentionOperator {
  operation: 'prefer_newest_value';
}

export const preferNewestValueProcessor = ({
  field,
}: PreferNewestValue): IngestProcessorContainer => {
  const historicalField = `${ENRICH_FIELD}.${field}`;
  return {
    set: {
      if: `${isFieldMissingOrEmpty(`ctx.${field}`)} && !(${isFieldMissingOrEmpty(
        `ctx.${historicalField}`
      )})`,
      field,
      value: `{{${historicalField}}}`,
    },
  };
};
