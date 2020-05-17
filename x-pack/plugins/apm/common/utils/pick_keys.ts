/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { pick } from 'lodash';

export function pickKeys<T, K extends keyof T>(obj: T, ...keys: K[]) {
  return pick(obj, keys) as Pick<T, K>;
}
