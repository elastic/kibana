/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import { ENRICH_FIELD } from '../constants';
import { isFieldMissingOrEmpty } from '../painless_utils';
import type { BaseFieldRetentionOperator } from './types';

// A field retention operator that collects up to `maxLength` values of the field. e.g collect up to 10 values of ip_address
export interface CollectValues extends BaseFieldRetentionOperator {
  operation: 'collect_values';
  maxLength: number;
}

export const collectValuesProcessor = ({
  field,
  maxLength,
}: CollectValues): IngestProcessorContainer => {
  const ctxField = `ctx.${field}`;
  const enrichField = `ctx.${ENRICH_FIELD}.${field}`;
  return {
    script: {
      lang: 'painless',
      source: `
  Set uniqueVals = new HashSet();
  
  if (!(${isFieldMissingOrEmpty(ctxField)})) {
    uniqueVals.addAll(${ctxField});
  }
  
  if (uniqueVals.size() < params.max_length && !(${isFieldMissingOrEmpty(enrichField)})) {
    int remaining = params.max_length - uniqueVals.size();
    List historicalVals = ${enrichField}.subList(0, (int) Math.min(remaining, ${enrichField}.size()));
    uniqueVals.addAll(historicalVals);
  }
  
  ${ctxField} = new ArrayList(uniqueVals).subList(0, (int) Math.min(params.max_length, uniqueVals.size()));
  `,
      params: {
        max_length: maxLength,
      },
    },
  };
};
