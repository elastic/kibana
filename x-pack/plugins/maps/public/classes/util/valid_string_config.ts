/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Validate user-generated data (e.g. descriptors). Possibly dirty or of wrong type.
 * @param value
 */
export function isValidStringConfig(value: any): boolean {
  return typeof value === 'string' && value !== '';
}
