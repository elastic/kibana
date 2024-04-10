/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Validates whether string input can be parsed as a valid JSON
 * @param value User input value.
 */
export function isJsonString(value: unknown): boolean {
  if (typeof value !== 'string') return false;

  try {
    return !!JSON.parse(value);
  } catch (e) {
    return false;
  }
}
