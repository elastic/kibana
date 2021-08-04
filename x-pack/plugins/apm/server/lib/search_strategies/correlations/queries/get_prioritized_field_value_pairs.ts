/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIELDS_TO_ADD_AS_CANDIDATE } from '../constants';
import { hasPrefixToInclude } from '../utils';

import type { FieldValuePairs } from './query_field_value_pairs';

export const getPrioritizedFieldValuePairs = (
  fieldValuePairs: FieldValuePairs
) => {
  const prioritizedFields = [...FIELDS_TO_ADD_AS_CANDIDATE];

  return fieldValuePairs.sort((a, b) => {
    const hasPrefixA = hasPrefixToInclude(a.field);
    const hasPrefixB = hasPrefixToInclude(b.field);

    const includesA = prioritizedFields.includes(a.field);
    const includesB = prioritizedFields.includes(b.field);

    if ((includesA || hasPrefixA) && !includesB && !hasPrefixB) {
      return -1;
    } else if (!includesA && !hasPrefixA && (includesB || hasPrefixB)) {
      return 1;
    }

    return 0;
  });
};
