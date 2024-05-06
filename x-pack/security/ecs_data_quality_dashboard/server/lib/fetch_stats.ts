/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesStatsResponse } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';

export const fetchStats = (
  client: IScopedClusterClient,
  indexPattern: string
): Promise<IndicesStatsResponse> =>
  client.asCurrentUser.indices.stats({
    expand_wildcards: ['open'],
    index: indexPattern,
  });
