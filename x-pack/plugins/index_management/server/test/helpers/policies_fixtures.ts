/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EnrichPolicyType } from '@elastic/elasticsearch/lib/api/types';

export const createTestESEnrichPolicy = (name: string, type: EnrichPolicyType) => ({
  config: {
    [type]: {
      name,
      indices: ['users'],
      match_field: 'email',
      enrich_fields: ['first_name', 'last_name', 'city'],
    },
  },
});
