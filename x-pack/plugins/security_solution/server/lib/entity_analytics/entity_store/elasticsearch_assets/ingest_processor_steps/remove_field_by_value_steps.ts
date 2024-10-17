/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import { getConditionalPath } from '../../painless';

/**
 * Remove a field if it has a specific value.
 */
export const removeFieldByValueSteps = (
  data: Array<{ field: string; value: string | number }>
): IngestProcessorContainer[] =>
  data.map(({ field, value }) => {
    const conditionalPath = getConditionalPath(`ctx.${field}`);
    const v = typeof value === 'string' ? `'${value}'` : value;

    return {
      remove: {
        if: `${conditionalPath} == ${v}`,
        field,
        ignore_missing: true,
      },
    };
  });
