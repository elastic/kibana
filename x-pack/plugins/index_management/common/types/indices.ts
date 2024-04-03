/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  HealthStatus,
  IlmExplainLifecycleLifecycleExplain,
  IndicesStatsIndexMetadataState,
  Uuid,
} from '@elastic/elasticsearch/lib/api/types';

interface IndexModule {
  number_of_shards: number | string;
  codec: string;
  routing_partition_size: number;
  load_fixed_bitset_filters_eagerly: boolean;
  shard: {
    check_on_startup: boolean | 'checksum';
  };
  number_of_replicas: number;
  auto_expand_replicas: false | string;
  lifecycle: LifecycleModule;
  routing: {
    allocation: {
      enable: 'all' | 'primaries' | 'new_primaries' | 'none';
    };
    rebalance: {
      enable: 'all' | 'primaries' | 'replicas' | 'none';
    };
  };
}

interface AnalysisModule {
  analyzer: {
    [key: string]: {
      type: string;
      tokenizer: string;
      char_filter?: string[];
      filter?: string[];
      position_increment_gap?: number;
    };
  };
}

interface LifecycleModule {
  name: string;
  rollover_alias?: string;
  parse_origination_date?: boolean;
  origination_date?: number;
}

export interface IndexSettings {
  index?: Partial<IndexModule>;
  analysis?: AnalysisModule;
  [key: string]: any;
}

export interface Index {
  name: string;
  primary?: number | string;
  replica?: number | string;
  isFrozen: boolean;
  hidden: boolean;
  aliases: string | string[];
  data_stream?: string;

  // The types below are added by extension services if corresponding plugins are enabled (ILM, Rollup, CCR)
  isRollupIndex?: boolean;
  ilm?: IlmExplainLifecycleLifecycleExplain;
  isFollowerIndex?: boolean;

  // The types from here below represent information returned from the index stats API;
  // treated optional as the stats API is not available on serverless
  health?: HealthStatus;
  status?: IndicesStatsIndexMetadataState;
  uuid?: Uuid;
  documents?: number;
  size?: string;
  primary_size?: string;
  documents_deleted?: number;
}

export interface IndexSettingsResponse {
  settings: IndexSettings;
  defaults: IndexSettings;
}
