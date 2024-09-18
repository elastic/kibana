/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const metadataForDependencyMapping = (fields: Partial<Record<string, unknown[]>>) => {
  return {
    span: {
      type: normalizeValue<string>(fields['span.type']),
      subtype: normalizeValue<string>(fields['span.subtype']),
    },
  };
};

const normalizeValue = <T>(field: unknown[] | unknown): T => {
  return (Array.isArray(field) && field.length > 0 ? field[0] : field) as T;
};
