/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ItemsetResult } from '../../../common/types';

export function getValueCounts(df: ItemsetResult[], field: string) {
  return df.reduce<Record<string, number>>((p, c) => {
    if (c.set[field] === undefined) {
      return p;
    }
    p[c.set[field]] = p[c.set[field]] ? p[c.set[field]] + 1 : 1;
    return p;
  }, {});
}
