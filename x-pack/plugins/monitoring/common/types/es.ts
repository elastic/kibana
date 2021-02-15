/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

export interface ElasticsearchSource {
  timestamp: string;
  kibana_stats?: ElasticsearchSourceKibanaStats;
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
}
