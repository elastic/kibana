/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';

export const normalizeFields = (
  fields: Partial<Record<string, unknown[]>>
): Record<string, unknown> => {
  const normalizedFields: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(fields)) {
    const normalizedValue = Array.isArray(value) && value.length > 0 ? value[0] : value;

    set(normalizedFields, key, normalizedValue);
  }

  return normalizedFields;
};
