/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  HealthStatus,
  IndicesStatsIndexMetadataState,
} from '@elastic/elasticsearch/lib/api/types';

export interface GetIndicesIndexData {
  aliases: string[];
  count: number; // Elasticsearch _count
  health?: HealthStatus;
  name: string;
  status?: IndicesStatsIndexMetadataState;
}

export interface GetIndicesResponse {
  indices: GetIndicesIndexData[];
}
