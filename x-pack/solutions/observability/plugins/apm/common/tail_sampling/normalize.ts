/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Returns a copy with object keys sorted at every level. Array order is kept,
 * because policy order is part of the config.
 *
 * Two configs that differ only in field order normalize to the same value, so
 * they store, compare and hash the same.
 */
export function normalizeTailSamplingConfig<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(normalizeTailSamplingConfig) as T;
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, normalizeTailSamplingConfig(record[key])])
    ) as T;
  }
  return value;
}
