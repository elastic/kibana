/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function toSpaceIdentifier(value = '') {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, '-');
}

export function isValidSpaceIdentifier(value = '') {
  return value === toSpaceIdentifier(value);
}
