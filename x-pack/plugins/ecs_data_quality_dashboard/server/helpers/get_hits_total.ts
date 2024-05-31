/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHitsMetadata } from '@elastic/elasticsearch/lib/api/types';

export const getHitsTotal = <T extends SearchHitsMetadata>(hits: T): number | undefined => {
  const hitsTotal = hits.total;
  if (hitsTotal != null) {
    if (typeof hitsTotal === 'object') {
      return hitsTotal.value;
    } else {
      return hitsTotal;
    }
  }
};
