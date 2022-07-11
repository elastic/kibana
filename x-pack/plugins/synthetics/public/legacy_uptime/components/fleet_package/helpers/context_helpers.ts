/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function formatDefaultValues<Fields>(
  keys: Array<keyof Fields>,
  defaultValues: Partial<Fields>
) {
  return keys.reduce((acc: any, currentValue) => {
    const key = currentValue as keyof Fields;
    acc[key] = defaultValues?.[key];
    return acc;
  }, {}) as Fields;
}
