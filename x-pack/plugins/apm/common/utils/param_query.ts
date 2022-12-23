/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeKuery } from '@kbn/es-query';

export function paramQuery<T extends string>(
  field: T,
  value: string | boolean | number | undefined | null
) {
  if (!value) return [];
  return [escapeKuery(`${[field]}: ${value}`)];
}
