/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantTerm, SignificantTermGroup } from '@kbn/ml-agg-utils';

export function getMissingSignificantTerms(
  deduplicatedSignificantTerms: SignificantTerm[],
  significantTermGroups: SignificantTermGroup[]
) {
  return deduplicatedSignificantTerms.filter((cp) => {
    return !significantTermGroups.some((cpg) => {
      return cpg.group.some((d) => d.fieldName === cp.fieldName && d.fieldValue === cp.fieldValue);
    });
  });
}
