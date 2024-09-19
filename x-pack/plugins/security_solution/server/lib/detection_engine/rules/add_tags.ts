/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_RULE_ID_KEY, INTERNAL_IMMUTABLE_KEY } from '../../../../common/constants';

export const addTags = (tags: string[], ruleId: string, immutable: boolean): string[] => {
  return Array.from(
    new Set([
      ...tags.filter(
        (tag) => !(tag.startsWith(INTERNAL_RULE_ID_KEY) || tag.startsWith(INTERNAL_IMMUTABLE_KEY))
      ),
      `${INTERNAL_RULE_ID_KEY}:${ruleId}`,
      `${INTERNAL_IMMUTABLE_KEY}:${immutable}`,
    ])
  );
};
