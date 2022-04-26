/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleExecutionMetrics } from '../types';
import type { ScopedClusterClientMetrics } from './wrap_scoped_cluster_client';
import type { SearchSourceClientMetrics } from './wrap_search_source_fetch';

export const mergeSearchMetrics = (
  scopedClusterClientMetrics: ScopedClusterClientMetrics,
  searchSourceMetrics: SearchSourceClientMetrics
): RuleExecutionMetrics => {
  return {
    numSearches: scopedClusterClientMetrics.numSearches,
    numSearchSourceSearches: searchSourceMetrics.numSearchSourceSearches,
    totalSearchDurationMs:
      scopedClusterClientMetrics.totalSearchDurationMs + searchSourceMetrics.totalSearchDurationMs,
    esSearchDurationMs:
      scopedClusterClientMetrics.esSearchDurationMs + searchSourceMetrics.esSearchDurationMs,
  };
};
