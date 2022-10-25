/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

export function isRequestAbortedError(e: unknown): boolean {
  return isPopulatedObject(e, ['name']) && e.name === 'RequestAbortedError';
}
