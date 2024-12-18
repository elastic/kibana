/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

export function entityQuery(entity: Record<string, string>): QueryDslQueryContainer[] {
  return [
    {
      bool: {
        filter: Object.entries(entity).map(([field, value]) => {
          return {
            term: {
              [field]: value,
            },
          };
        }),
      },
    },
  ];
}
