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
    // This function will be fixed in https://github.com/elastic/kibana/issues/192749
    const arrayValue =
      Array.isArray(value) && (value.length > 1 || key === 'process.args')
        ? value
        : normalizedValue ?? '';

    set(normalizedFields, key, arrayValue);
  }

  return normalizedFields;
};
