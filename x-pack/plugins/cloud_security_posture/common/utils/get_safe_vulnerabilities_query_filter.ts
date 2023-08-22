/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

export const getSafeVulnerabilitiesQueryFilter = (query?: QueryDslQueryContainer) => ({
  ...query,
  bool: {
    ...query?.bool,
    filter: [
      ...((query?.bool?.filter as []) || []),
      { exists: { field: 'vulnerability.score.base' } },
      { exists: { field: 'vulnerability.score.version' } },
      { exists: { field: 'resource.id' } },
    ],
  },
});
