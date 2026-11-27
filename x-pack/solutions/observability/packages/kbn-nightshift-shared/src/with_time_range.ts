/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';

/**
 * Keeps the rows whose `@timestamp` is within `[from, to]` (ISO 8601), bound as the `?fromIso`
 * and `?toIso` parameters.
 */
export const withTimeRange = (
  query: ComposerQuery,
  { from, to }: { from?: string; to?: string }
): ComposerQuery => {
  let next = query;
  if (from !== undefined) {
    next = next.where`@timestamp >= TO_DATETIME(${{ fromIso: from }})`;
  }
  if (to !== undefined) {
    next = next.where`@timestamp <= TO_DATETIME(${{ toIso: to }})`;
  }
  return next;
};
