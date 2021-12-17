/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortOverrideType } from '../indexpattern_datasource/operations/definitions/column_types';

export function hasSortOverrideActive(sortOverride?: unknown): sortOverride is SortOverrideType {
  return Boolean(
    sortOverride &&
      typeof sortOverride === 'object' &&
      'type' in sortOverride &&
      (sortOverride as SortOverrideType).type !== 'none'
  );
}
