/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  HealthStatus,
  IndexName,
  IndicesStatsIndexMetadataState,
  Uuid,
} from '@elastic/elasticsearch/lib/api/types';

export interface ElasticsearchIndex {
  health?: HealthStatus;
  status?: IndicesStatsIndexMetadataState;
  name: IndexName;
  uuid?: Uuid;
  total: {
    docs: {
      count: number;
      deleted: number;
    };
    store: {
      size_in_bytes: string;
    };
  };
}
