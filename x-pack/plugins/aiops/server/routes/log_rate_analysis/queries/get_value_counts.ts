/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ItemSet } from '@kbn/aiops-utils/log_rate_analysis/types';

export function getValueCounts(df: ItemSet[], field: string) {
  return df.reduce<Record<string, number>>((p, c) => {
    const fieldItems = c.set.filter((d) => d.fieldName === field);

    if (fieldItems.length === 0) {
      return p;
    }

    for (const { fieldValue } of fieldItems) {
      p[fieldValue] = p[fieldValue] ? p[fieldValue] + 1 : 1;
    }

    return p;
  }, {});
}
