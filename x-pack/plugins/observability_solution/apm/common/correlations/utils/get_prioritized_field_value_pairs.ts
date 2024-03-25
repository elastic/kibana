/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIELDS_TO_ADD_AS_CANDIDATE } from '../constants';
import { hasPrefixToInclude } from './has_prefix_to_include';

import type { FieldValuePair } from '../types';

export const getPrioritizedFieldValuePairs = (
  fieldValuePairs: FieldValuePair[]
) => {
  const prioritizedFields = [...FIELDS_TO_ADD_AS_CANDIDATE];

  return fieldValuePairs.sort((a, b) => {
    const hasPrefixA = hasPrefixToInclude(a.fieldName);
    const hasPrefixB = hasPrefixToInclude(b.fieldName);

    const includesA = prioritizedFields.includes(a.fieldName);
    const includesB = prioritizedFields.includes(b.fieldName);

    if ((includesA || hasPrefixA) && !includesB && !hasPrefixB) {
      return -1;
    } else if (!includesA && !hasPrefixA && (includesB || hasPrefixB)) {
      return 1;
    }

    return 0;
  });
};
