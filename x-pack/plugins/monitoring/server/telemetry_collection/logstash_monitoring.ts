/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

export type Counter = Map<string, number>;
export const HITS_SIZE = 10000; // maximum hits to receive from ES with each search
export const LOGSTASH_PLUGIN_TYPES = ['input', 'codec', 'filter', 'output'];

export interface LogstashMonitoring {
  collectMetrics(
    callCluster: ElasticsearchClient,
    clusterUuids: string[],
    monitoringClusterUuid: string,
    start: string,
    end: string,
    options: LogstashProcessOptions
  ): Promise<LogstashStatsByClusterUuid>;

  setIndexPattern(pattern: string): void;
}

export interface LogstashBaseStats {
  // stats
  versions: Array<{ version: string; count: number }>;
  count: number;

  cluster_stats?: {
    collection_types?: { [collection_type_type: string]: number };
    queues?: { [queue_type: string]: number };
    plugins?: Array<{ name: string; count: number }>;
    monitoringClusterUuid?: string;
    pipelines?: {
      count?: number;
      batch_size_max?: number;
      batch_size_avg?: number;
      batch_size_min?: number;
      batch_size_total?: number;
      workers_max?: number;
      workers_avg?: number;
      workers_min?: number;
      workers_total?: number;
      sources?: { [source_type: string]: boolean };
    };
  };
}

export const getLogstashBaseStats = () => ({
  versions: [],
  count: 0,
  cluster_stats: {
    pipelines: {},
    plugins: [],
  },
});

export interface LogstashStats {
  cluster_uuid: string;
  source_node: string;
  type: string;
  agent?: {
    type: string;
  };
  host?: {
    id?: string;
  };
  // legacy monitoring shape
  logstash_stats?: {
    pipelines?: [
      {
        id?: string;
        ephemeral_id: string;
        queue?: {
          type: string;
        };
      }
    ];
    logstash?: {
      version?: string;
      uuid?: string;
      snapshot?: string;
    };
  };
  // metricbeat and agent driven monitoring shape
  logstash?: {
    node?: {
      stats?: {
        pipelines?: [
          {
            id?: string;
            ephemeral_id: string;
            queue?: {
              type: string;
            };
          }
        ];
        logstash?: {
          version?: string;
          uuid?: string;
          snapshot?: string;
          ephemeral_id: string;
          pipelines?: [];
        };
      };
    };
    elasticsearch?: {
      cluster?: {
        id?: string;
      };
    };
  };
}

export interface LogstashState {
  // legacy monitoring shape
  cluster_uuid: string;
  logstash_state?: {
    pipeline?: {
      batch_size?: number;
      workers?: number;
      representation?: {
        graph?: {
          vertices?: [
            {
              config_name?: string;
              plugin_type?: string;
              meta?: {
                source?: {
                  protocol?: string;
                };
              };
            }
          ];
        };
      };
    };
  };
  logstash?: {
    // metricbeat monitoring shape
    node?: {
      state?: {
        pipeline?: {
          batch_size?: number;
          workers?: number;
          representation?: {
            graph?: {
              vertices?: [
                {
                  config_name?: string;
                  plugin_type?: string;
                  meta?: {
                    source?: {
                      protocol?: string;
                    };
                  };
                }
              ];
            };
          };
        };
      };
    };
    elasticsearch?: {
      cluster?: {
        id?: string;
      };
    };
    // agent monitoring shape
    pipeline?: {
      elasticsearch?: {
        cluster?: {
          id?: string;
        };
      };
      id: string;
      plugin?: {
        // <plugin type: PluginName>
        [key: string]: PluginName;
      };
    };
  };
}

export interface LogstashProcessOptions {
  clusters: { [clusterUuid: string]: LogstashBaseStats };
  allEphemeralIds: { [clusterUuid: string]: string[] }; // pipeline ephemeral IDs
  allHostIds: { [clusterUuid: string]: string[] };
  versions: { [clusterUuid: string]: Counter };
  plugins: { [clusterUuid: string]: Counter };
}

export interface PluginName {
  name: string;
}

export interface LogstashStatsByClusterUuid {
  [clusterUuid: string]: LogstashBaseStats;
}
