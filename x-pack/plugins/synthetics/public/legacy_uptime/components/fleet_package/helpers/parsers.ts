/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function parseJsonIfString<T>(value: T) {
  if (typeof value === 'string') {
    return JSON.parse(value);
  }

  return value;
}
