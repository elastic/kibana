/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import { isFieldMissingOrEmpty } from '../painless_utils';

/**
 * This function creates an ingest processor step that takes the first value
 * from a list or set and assigns it to the field.
 */
export const takeFirstValueStep = (field: string): IngestProcessorContainer => {
  const ctxField = `ctx.${field}`;
  return {
    script: {
      lang: 'painless',
      source: `
        if (!(${isFieldMissingOrEmpty(ctxField)})){
          if (${ctxField} instanceof List) {
            ${ctxField} = ${ctxField}[0];
          } else if (${ctxField} instanceof Set) {
            ${ctxField} = ${ctxField}.toArray()[0];
          }
        }
      `,
    },
  };
};
