/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface ElasticsearchResponse {
  hits?: {
    hits: ElasticsearchResponseHit[];
    total: {
      value: number;
    };
  };
  aggregations?: any;
}

export interface ElasticsearchResponseHit {
  _index: string;
  _source: ElasticsearchSource;
  inner_hits?: {
    [field: string]: {
      hits?: {
        hits: ElasticsearchResponseHit[];
        total: {
          value: number;
        };
      };
    };
  };
}

export interface ElasticsearchSourceKibanaStats {
  timestamp?: string;
  kibana?: {
    name?: string;
    status?: string;
    uuid?: string;
    response_times?: {
      max?: number;
    };
  };
  os?: {
    memory?: {
      free_in_bytes?: number;
    };
  };
  process?: {
    uptime_in_millis?: number;
  };
}

export interface ElasticsearchSourceLogstashPipelineVertex {
  id: string;
  plugin_type: string;
  stats?: {
    [key: string]: {
      data?: any[];
    };
  };
}

export interface ElasticsearchNodeStats {
  indices?: {
    docs?: {
      count?: number;
    };
    store?: {
      size_in_bytes?: number;
      size?: {
        bytes?: number;
      };
    };
  };
  fs?: {
    total?: {
      available_in_bytes?: number;
      total_in_bytes?: number;
    };
    summary?: {
      available?: {
        bytes?: number;
      };
      total?: {
        bytes?: number;
      };
    };
  };
  jvm?: {
    mem?: {
      heap_used_percent?: number;
      heap?: {
        used?: {
          pct?: number;
        };
      };
    };
  };
}

export interface ElasticsearchLegacySource {
  timestamp: string;
  cluster_uuid: string;
  cluster_stats?: {};
  cluster_state?: {
    nodes?: {
      [nodeUuid: string]: {};
    };
    master_node?: boolean;
  };
  source_node?: {
    id?: string;
    uuid?: string;
    attributes?: {};
    transport_address?: string;
    name?: string;
    type?: string;
  };
  kibana_stats?: ElasticsearchSourceKibanaStats;
  license?: {
    status?: string;
    type?: string;
  };
  logstash_state?: {
    pipeline?: {
      representation?: {
        graph?: {
          vertices?: ElasticsearchSourceLogstashPipelineVertex[];
        };
      };
    };
  };
  logstash_stats?: {
    timestamp?: string;
    logstash?: {};
    events?: {};
    reloads?: {};
    queue?: {
      type?: string;
    };
    jvm?: {
      uptime_in_millis?: number;
    };
  };
  beats_stats?: {
    timestamp?: string;
    beat?: {
      uuid?: string;
      name?: string;
      type?: string;
      version?: string;
      host?: string;
    };
    metrics?: {
      beat?: {
        memstats?: {
          memory_alloc?: number;
        };
        info?: {
          uptime?: {
            ms?: number;
          };
        };
        handles?: {
          limit?: {
            hard?: number;
            soft?: number;
          };
        };
      };
      libbeat?: {
        config?: {
          reloads?: number;
        };
        output?: {
          type?: string;
          write?: {
            bytes?: number;
            errors?: number;
          };
          read?: {
            errors?: number;
          };
        };
        pipeline?: {
          events?: {
            total?: number;
            published?: number;
            dropped?: number;
          };
        };
      };
    };
  };
  stack_stats?: {
    xpack?: {
      ccr?: {
        enabled?: boolean;
        available?: boolean;
      };
    };
  };
  job_stats?: {};
  index_stats?: {
    index?: string;
    primaries?: {
      docs?: {
        count?: number;
      };
      store?: {
        size_in_bytes?: number;
      };
      indexing?: {
        index_total?: number;
      };
    };
    total?: {
      store?: {
        size_in_bytes?: number;
      };
      search?: {
        query_total?: number;
      };
    };
  };
  node_stats?: ElasticsearchNodeStats;
  service?: {
    address?: string;
  };
  shard?: {
    index?: string;
    shard?: string;
    primary?: boolean;
    relocating_node?: string;
    node?: string;
  };
  ccr_stats?: {
    leader_index?: string;
  };
}

export interface ElasticsearchMetricbeatNode {
  stats?: ElasticsearchNodeStats;
}

export interface ElasticsearchMetricbeatSource {
  elasticsearch?: {
    node?: ElasticsearchLegacySource['source_node'] & ElasticsearchMetricbeatNode;
  };
}

export type ElasticsearchSource = ElasticsearchLegacySource & ElasticsearchMetricbeatSource;

export interface ElasticsearchModifiedSource extends ElasticsearchSource {
  ccs?: string;
  isSupported?: boolean;
}
