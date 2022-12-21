/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';

export function pickKeys<T, K extends keyof T>(obj: T, ...keys: K[]) {
  return pick(obj, keys) as Pick<T, K>;
}
