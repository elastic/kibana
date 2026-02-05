/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

function isUndefinedOrNull(value: any): value is undefined | null {
  return value === undefined || value === null;
}

export function termsQuery(
  field: string,
  ...values: Array<string | boolean | undefined | number | null>
): QueryDslQueryContainer[] {
  const filtered = values.filter(
    (value): value is NonNullable<typeof value> => !isUndefinedOrNull(value)
  );

  if (!filtered.length) {
    return [];
  }

  return [{ terms: { [field]: filtered } }];
}
