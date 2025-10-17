/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getFieldValue = <T>(
  field: string,
  record: Record<string, unknown[] | undefined>
): T => {
  const fieldValue = record[field];

  return (Array.isArray(fieldValue) ? fieldValue[0] : fieldValue) as T;
};
