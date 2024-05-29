/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import {
  INDEX_PATTERN_LOGSTASH,
  METRICBEAT_INDEX_NAME_UNIQUE_TOKEN,
  TELEMETRY_QUERY_SOURCE,
} from '../../common/constants';
import { collectLogstashAgentMonitoringMetrics } from './get_logstash_agent_monitoring_stats';
import { collectLogstashMetricbeatMonitoringMetrics } from './get_logstash_metricbeat_monitoring_stats';
import { collectLogstashSelfMonitoringMetrics } from './get_logstash_self_monitoring_stats';

export type Counter = Map<string, number>;
export const HITS_SIZE = 10000; // maximum hits to receive from ES with each search

const SELF_MONITORING: string = 'self_monitoring';
const METRICBEAT_MONITORING: string = 'metricbeat_monitoring';
const AGENT_MONITORING: string = 'agent_monitoring';

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

/*
 * Call the function for fetching and summarizing Logstash stats
 * @return {Object} - Logstash stats in an object keyed by the cluster UUIDs
 */
export async function getLogstashStats(
  callCluster: ElasticsearchClient,
  clusterUuids: string[],
  start: string,
  end: string
): Promise<LogstashStatsByClusterUuid> {
  const options: LogstashProcessOptions = {
    clusters: {}, // the result object to be built up
    allEphemeralIds: {},
    allHostIds: {},
    versions: {},
    plugins: {},
  };
  const monitoringClusterInfo = await callCluster.info();
  const monitoringClusterUuid: string = monitoringClusterInfo.cluster_uuid;

  // figure out the monitoring methods cluster is using based on the Logstash metrics indices
  // mostly single method will be resolved
  // multiple monitoring methods case might be due to migration (ex: from self to metricbeat)
  const monitoringMethods: string[] = await getLogstashMonitoringMethods(callCluster);

  // collect all _method_ (:self, :metricbeat, :agent) metrics in a given period
  for (const monitoringMethod of monitoringMethods) {
    switch (monitoringMethod) {
      case SELF_MONITORING:
        await collectLogstashSelfMonitoringMetrics(
          callCluster,
          clusterUuids,
          monitoringClusterUuid,
          start,
          end,
          options
        );
        break;
      case METRICBEAT_MONITORING:
        await collectLogstashMetricbeatMonitoringMetrics(
          callCluster,
          monitoringClusterUuid,
          start,
          end,
          options
        );
        break;
      case AGENT_MONITORING:
        await collectLogstashAgentMonitoringMetrics(
          callCluster,
          monitoringClusterUuid,
          start,
          end,
          options
        );
        break;
    }
  }
  return options.clusters;
}

export async function getLogstashMonitoringMethods(
  callCluster: ElasticsearchClient
): Promise<string[]> {
  const response = await callCluster.cat.indices(
    { index: INDEX_PATTERN_LOGSTASH, format: 'json' },
    {
      headers: {
        'X-QUERY-SOURCE': TELEMETRY_QUERY_SOURCE,
      },
    }
  );

  const monitoringMethods: string[] = [];
  for (const record of response) {
    if (record.index!.indexOf('monitoring-logstash-') !== -1) {
      if (record.index!.indexOf(METRICBEAT_INDEX_NAME_UNIQUE_TOKEN) !== -1) {
        if (!monitoringMethods.includes(METRICBEAT_MONITORING)) {
          monitoringMethods.push(METRICBEAT_MONITORING);
        }
      } else {
        if (!monitoringMethods.includes(SELF_MONITORING)) {
          monitoringMethods.push(SELF_MONITORING);
        }
      }
    } else if (record.index!.indexOf('metrics-logstash.node') !== -1) {
      if (!monitoringMethods.includes(AGENT_MONITORING)) {
        monitoringMethods.push(AGENT_MONITORING);
      }
    }
  }

  return monitoringMethods;
}
