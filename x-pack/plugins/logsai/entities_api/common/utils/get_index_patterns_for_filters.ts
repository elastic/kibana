/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityFilter } from '../entities';

export function getIndexPatternsForFilters(filters: EntityFilter[]) {
  return filters.flatMap((filter) => {
    if ('index' in filter) {
      return filter.index.flat();
    }
    return [];
  });
}
