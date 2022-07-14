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

import { Connector } from './connectors';
import { Crawler } from './crawler';

export interface ElasticsearchIndex {
  health?: HealthStatus;
  name: IndexName;
  status?: IndicesStatsIndexMetadataState;
  total: {
    docs: {
      count: number;
      deleted: number;
    };
    store: {
      size_in_bytes: string;
    };
  };
  uuid?: Uuid;
}

export interface ElasticsearchIndexWithIngestion extends ElasticsearchIndex {
  connector?: Connector;
  crawler?: Crawler;
}

export interface EntSearchIndex {
  connector?: Connector;
  crawler?: Crawler;
  index: ElasticsearchIndex;
}
