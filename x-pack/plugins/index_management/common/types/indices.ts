/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  health?: string;
  status?: string;
  name: string;
  uuid?: string;
  primary?: number | string;
  replica?: number | string;
  documents: number;
  documents_deleted: number;
  size: string;
  primary_size: string;
  isFrozen: boolean;
  hidden: boolean;
  aliases: string | string[];
  data_stream?: string;
  [key: string]: any;
}
