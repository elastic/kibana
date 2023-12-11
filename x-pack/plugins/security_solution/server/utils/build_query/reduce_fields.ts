/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const reduceFields = (
  fields: readonly string[],
  fieldMap: Readonly<Record<string, string>>
): readonly string[] =>
  fields.reduce((res, field) => {
    if (fieldMap[field] != null) {
      res.push(fieldMap[field]);
    }
    return res;
  }, [] as string[]);
