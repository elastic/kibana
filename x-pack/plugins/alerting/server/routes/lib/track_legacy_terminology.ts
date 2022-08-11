/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { flatten } from 'lodash';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';

export const LEGACY_TERMS = ['alertTypeId', 'actionTypeId'];

export function trackLegacyTerminology(
  terms: Array<string | string[]>,
  usageCounter?: UsageCounter
) {
  if (!usageCounter) {
    return null;
  }

  if (!terms || terms.length === 0) {
    return null;
  }

  for (const legacyTerm of LEGACY_TERMS) {
    for (const term of flatten(terms)) {
      if (term.includes(legacyTerm)) {
        usageCounter.incrementCounter({
          counterName: `legacyTerm_${legacyTerm}`,
          counterType: 'legacyTerminology',
          incrementBy: 1,
        });
      }
    }
  }
}
