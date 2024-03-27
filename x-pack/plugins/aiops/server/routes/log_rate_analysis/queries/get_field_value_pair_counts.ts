/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantItemGroup } from '@kbn/ml-agg-utils';
import type { FieldValuePairCounts } from '@kbn/aiops-utils/log_rate_analysis/types';

/**
 * Get a nested record of field/value pairs with counts
 */
export function getFieldValuePairCounts(cpgs: SignificantItemGroup[]): FieldValuePairCounts {
  return cpgs.reduce<FieldValuePairCounts>((p, { group }) => {
    group.forEach(({ fieldName, fieldValue }) => {
      if (p[fieldName] === undefined) {
        p[fieldName] = {};
      }
      p[fieldName][fieldValue] = p[fieldName][fieldValue] ? p[fieldName][fieldValue] + 1 : 1;
    });
    return p;
  }, {});
}
