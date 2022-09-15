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
  count: number; // Elasticsearch _count
  health?: HealthStatus;
  hidden: boolean;
  name: IndexName;
  status?: IndicesStatsIndexMetadataState;
  total: {
    docs: {
      count: number; // Lucene count (includes nested documents)
      deleted: number;
    };
    store: {
      size_in_bytes: string;
    };
  };
  uuid?: Uuid;
}

export interface ConnectorIndex extends ElasticsearchIndex {
  connector: Connector;
}

export interface CrawlerIndex extends ElasticsearchIndex {
  crawler: Crawler;
  connector?: Connector;
}

export interface ElasticsearchIndexWithPrivileges extends ElasticsearchIndex {
  alias: boolean;
  privileges: {
    manage: boolean;
    read: boolean;
  };
}

export type ElasticsearchIndexWithIngestion = ElasticsearchIndex | ConnectorIndex | CrawlerIndex;
