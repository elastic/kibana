/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
    transport_address?: string;
    host?: string;
    version?: string;
  };
  os?: {
    memory?: {
      free_in_bytes?: number;
    };
    load?: {
      '1m'?: number;
    };
  };
  response_times?: {
    average?: number;
    max?: number;
  };
  requests?: {
    total?: number;
  };
  process?: {
    uptime_in_millis?: number;
    memory?: {
      resident_set_size_in_bytes?: number;
    };
  };
  concurrent_connections?: number;
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

export interface ElasticsearchIndexStats {
  index?: string;
  name?: string;
  shards: {
    primaries: number;
  };
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
}

export interface ElasticsearchLegacySource {
  timestamp: string;
  cluster_uuid: string;
  cluster_stats?: {
    nodes?: {
      count?: {
        total?: number;
      };
      jvm?: {
        max_uptime_in_millis?: number;
        mem?: {
          heap_used_in_bytes?: number;
          heap_max_in_bytes?: number;
        };
      };
      fs?: {
        available_in_bytes?: number;
        total_in_bytes?: number;
      };
      versions?: string[];
    };
    indices?: {
      count?: number;
      docs?: {
        deleted?: number;
        count?: number;
      };
      shards?: {
        total?: number;
        primaries?: number;
      };
      store?: {
        size_in_bytes?: number;
      };
    };
  };
  cluster_state?: {
    status?: string;
    state_uuid?: string;
    nodes?: {
      [nodeUuid: string]: {
        ephemeral_id?: string;
        name?: string;
      };
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
    expiry_date_in_millis?: number;
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
    logstash?: {
      timestamp?: string;
      pipeline: {
        batch_size: number;
        workers: number;
      };
      http_address: string;
      name: string;
      host: string;
      uuid: string;
      version: string;
      status: string;
    };
    queue?: {
      type?: string;
      events?: number;
    };
    jvm?: {
      uptime_in_millis?: number;
      mem?: {
        heap_used_percent?: number;
      };
    };
    process?: {
      cpu?: {
        percent?: number;
      };
    };
    os?: {
      cpu?: {
        load_average?: {
          '1m'?: number;
        };
      };
    };
    events?: {
      out?: number;
      in?: number;
      filtered?: number;
    };
    reloads?: {
      failures?: number;
      successes?: number;
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
        cgroup?: {
          memory: {
            id: string;
            mem: {
              limit: {
                bytes: number;
              };
              usage: {
                bytes: number;
              };
            };
          };
        };
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
  job_stats?: {
    job_id?: number;
    state?: string;
    data_counts?: {
      processed_record_count?: number;
    };
    model_size_stats?: {
      model_bytes?: number;
    };
    forecasts_stats?: {
      total?: number;
    };
    node?: {
      id?: number;
      name?: string;
    };
  };
  index_stats?: ElasticsearchIndexStats;
  node_stats?: ElasticsearchNodeStats;
  shard?: {
    index?: string;
    shard?: string;
    state?: string;
    primary?: boolean;
    relocating_node: string | null;
    node?: string;
  };
  ccr_stats?: {
    leader_index?: string;
    follower_index?: string;
    shard_id?: number;
    read_exceptions?: Array<{
      exception?: {
        type?: string;
      };
    }>;
    time_since_last_read_millis?: number;
  };
  index_recovery?: {
    shards?: ElasticsearchIndexRecoveryShard[];
  };
}

export interface ElasticsearchIndexRecoveryShard {
  id?: number;
  name?: string;
  stage?: string;
  type?: string;
  primary?: boolean;
  source?: {
    name?: string;
    transport_address?: string;
  };
  target?: {
    name?: string;
    transport_address?: string;
  };
  index?: {
    files?: {
      percent?: string;
      recovered?: number;
      total?: number;
      reused?: number;
    };
    size?: {
      recovered_in_bytes?: number;
      reused_in_bytes?: number;
      total_in_bytes?: number;
    };
  };
  start_time_in_millis?: number;
  stop_time_in_millis?: number;
  translog?: {
    total?: number;
    percent?: string;
    total_on_start?: number;
  };
}

export interface ElasticsearchMetricbeatNode {
  name?: string;
  stats?: ElasticsearchNodeStats;
}

export interface ElasticsearchMetricbeatSource {
  '@timestamp'?: string;
  service?: {
    id?: string;
    address?: string;
    version?: string;
  };
  elasticsearch?: {
    node?: ElasticsearchLegacySource['source_node'] & ElasticsearchMetricbeatNode;
    index?: ElasticsearchIndexStats & {
      recovery?: ElasticsearchIndexRecoveryShard;
    };
    version?: string;
    shard?: ElasticsearchLegacySource['shard'] & {
      number?: string;
      relocating_node?: {
        id?: string;
      };
    };
    ml?: {
      job?: {
        id?: string;
        state?: string;
        model_size?: {};
        data_counts?: {
          processed_record_count?: number;
        };
        forecasts_stats?: {
          total?: number;
        };
      };
    };
    ccr?: {
      leader?: {
        index?: string;
      };
      follower?: {
        index?: string;
        shard?: {
          number?: number;
        };
        time_since_last_read?: {
          ms?: number;
        };
        operations_written?: number;
        failed_read_requests?: number;
      };

      read_exceptions?: Array<{
        exception?: {
          type?: string;
        };
      }>;
    };
    cluster?: {
      name?: string;
      id?: string;
      stats?: {
        license?: ElasticsearchLegacySource['license'];
        state?: {
          state_uuid?: string;
          master_node?: string;
          nodes?: {
            [uuid: string]: {};
          };
        };
        status?: string;
        version?: string;
        indices?: {
          total?: number;
          docs?: {
            deleted?: number;
            total?: number;
          };
          shards?: {
            count?: number;
            primaries?: number;
          };
          store?: {
            size?: {
              bytes?: number;
            };
          };
        };
        nodes?: {
          versions?: string[];
          count?: number | {};
          jvm?: {
            max_uptime?: {
              ms?: number;
            };
            memory?: {
              heap?: {
                used?: {
                  bytes?: number;
                };
                max?: {
                  bytes?: number;
                };
              };
            };
          };
          fs?: {
            available?: {
              bytes?: number;
            };
            total?: {
              bytes?: number;
            };
          };
        };
        stack?: {
          xpack?: {
            ccr?: {
              available?: boolean;
              enabled?: boolean;
            };
          };
        };
      };
    };
  };
  kibana?: {
    stats?: {
      name?: string;
      index?: string;
      status?: string;
      transport_address?: string;
      concurrent_connections?: number;
      snapshot?: boolean;
      host?: {
        name?: string;
      };
      process?: {
        uptime?: {
          ms?: number;
        };
        memory?: {
          heap?: {
            size_limit?: {
              bytes?: number;
            };
          };
          resident_set_size?: {
            bytes?: number;
          };
        };
      };
      os?: {
        load?: {
          '1m'?: number;
        };
        memory?: {
          free_in_bytes?: number;
        };
      };
      request?: {
        disconnects?: number;
        total?: number;
      };
      response_time?: {
        avg?: {
          ms?: number;
        };
        max?: {
          ms?: number;
        };
      };
    };
  };
  logstash?: {
    node?: {
      state?: {
        pipeline?: {
          id: string;
          name: string;
          representation?: {
            graph?: {
              vertices: ElasticsearchSourceLogstashPipelineVertex[];
            };
          };
        };
      };
      stats?: {
        timestamp?: string;
        logstash?: {
          pipeline: {
            batch_size: number;
            workers: number;
          };
          http_address: string;
          name: string;
          host: string;
          uuid: string;
          version: string;
          status: string;
        };
        queue?: {
          type?: string;
        };
        jvm?: {
          uptime_in_millis?: number;
          mem?: {
            heap_used_percent?: number;
          };
        };
        process?: {
          cpu?: {
            percent?: number;
          };
        };
        os?: {
          cpu?: {
            load_average?: {
              '1m'?: number;
            };
          };
        };
        events?: {
          out?: number;
        };
        reloads?: {
          failures?: number;
          successes?: number;
        };
      };
    };
  };
  beat?: {
    stats?: {
      timestamp?: string;
      beat?: {
        uuid?: string;
        name?: string;
        type?: string;
        version?: string;
        host?: string;
      };
      handles?: {
        limit?: {
          hard?: number;
          soft?: number;
        };
      };
      info?: {
        uptime?: {
          ms?: number;
        };
      };
      memstats?: {
        memory?: {
          alloc?: number;
        };
      };
      libbeat?: {
        config?: {
          reloads?: number;
        };
        output?: {
          type?: string;
          read?: {
            errors?: number;
          };
          write?: {
            bytes?: string;
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
  enterprisesearch?: {
    cluster_uuid?: string;
  };
}

export type ElasticsearchSource = ElasticsearchLegacySource & ElasticsearchMetricbeatSource;

export interface ElasticsearchModifiedSource extends ElasticsearchSource {
  ccs?: string;
  isSupported?: boolean;
}
