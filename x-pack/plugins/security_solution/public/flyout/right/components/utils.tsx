/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ENTITY_ICON = {
  host: 'storage',
  user: 'user',
} as const;

export const ENTITY_TYPE = {
  host: 'host',
  user: 'user',
} as const;

export const getField = (fieldsData: unknown, emptyValue?: string) => {
  if (typeof fieldsData === 'string') {
    return fieldsData;
  } else if (Array.isArray(fieldsData) && fieldsData.length > 0) {
    return fieldsData[0];
  }
  return emptyValue ?? null;
};
