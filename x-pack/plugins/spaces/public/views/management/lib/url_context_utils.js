/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function toUrlContext(value = '') {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '-');
}

export function isValidUrlContext(value = '') {
  return value === toUrlContext(value);
}
