/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getField = (field: unknown, emptyValue?: string) => {
  if (typeof field === 'string') {
    return field;
  } else if (Array.isArray(field) && field.length > 0 && typeof field[0] === 'string') {
    return field[0];
  }
  return emptyValue ?? null;
};
