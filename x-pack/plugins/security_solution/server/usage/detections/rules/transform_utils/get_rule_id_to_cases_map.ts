/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindResult } from '@kbn/core/server';
import type { AttachmentAttributes } from '@kbn/cases-plugin/common';

export const getRuleIdToCasesMap = (
  cases: Array<SavedObjectsFindResult<AttachmentAttributes>>
): Map<string, number> => {
  return cases.reduce((cache, { attributes: casesObject }) => {
    if (casesObject.type === 'alert') {
      const ruleId = casesObject.rule.id;
      if (ruleId != null) {
        const cacheCount = cache.get(ruleId);
        if (cacheCount === undefined) {
          cache.set(ruleId, 1);
        } else {
          cache.set(ruleId, cacheCount + 1);
        }
      }
    }
    return cache;
  }, new Map<string, number>());
};
