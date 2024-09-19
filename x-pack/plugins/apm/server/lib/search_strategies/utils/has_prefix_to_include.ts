/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIELD_PREFIX_TO_ADD_AS_CANDIDATE } from '../constants';

export const hasPrefixToInclude = (fieldName: string) => {
  return FIELD_PREFIX_TO_ADD_AS_CANDIDATE.some((prefix) =>
    fieldName.startsWith(prefix)
  );
};
