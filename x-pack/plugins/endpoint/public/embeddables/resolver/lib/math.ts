/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Return `value` unless it is less than `minimum`, in which case return `minimum` or unless it is greater than `maximum`, in which case return `maximum`.
 */
export function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(Math.min(value, maximum), minimum);
}
