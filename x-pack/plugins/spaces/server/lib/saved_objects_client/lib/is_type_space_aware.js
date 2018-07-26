/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Returns if the provided Saved Object type is "space aware".
 * Most types should be space-aware, and those that aren't should typically strive to become space-aware.
 * Types that are not space-aware will appear in every space, and are not bound by any space-specific access controls.
 */
export function isTypeSpaceAware(type) {
  return type !== 'space' && type !== 'config';
}
