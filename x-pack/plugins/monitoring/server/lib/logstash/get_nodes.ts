/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { createQuery } from '../create_query';
import { calculateAvailability } from '../calculate_availability';
import { LogstashMetric } from '../metrics';
import { LegacyRequest } from '../../types';
import { ElasticsearchResponse } from '../../../common/types/es';
import { getNewIndexPatterns } from '../cluster/get_index_patterns';
import { Globals } from '../../static_globals';

interface Logstash {
  jvm?: {
    mem?: {
      heap_used_percent?: number;
    };
  };
  logstash?: {
    pipeline?: {
      batch_size?: number;
      workers?: number;
    };
    http_address?: string;
    name?: string;
    host?: string;
    uuid?: string;
    version?: string;
    status?: string;
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
  availability?: boolean;
}

/*
 * Get detailed info for Logstash's in the cluster
 * for Logstash nodes listing page
 * For each instance:
 *  - name
 *  - status
 *  - JVM memory
 *  - os load average
 *  - events
 *  - config reloads
 */
export async function getNodes(req: LegacyRequest, { clusterUuid }: { clusterUuid: string }) {
  const dataset = 'node_stats';
  const type = 'logstash_stats';
  const moduleType = 'logstash';

  const indexPatterns = getNewIndexPatterns({
    config: Globals.app.config,
    ccs: req.payload.ccs,
    moduleType,
    dataset,
  });

  const config = req.server.config;
  const start = moment.utc(req.payload.timeRange.min).valueOf();
  const end = moment.utc(req.payload.timeRange.max).valueOf();

  const filters = [{ exists: { field: 'logstash_stats.logstash.uuid' } }];

  const params = {
    index: indexPatterns,
    size: config.ui.max_bucket_size,
    ignore_unavailable: true,
    body: {
      query: createQuery({
        type,
        dsDataset: `${moduleType}.${dataset}`,
        metricset: dataset,
        filters,
        start,
        end,
        clusterUuid,
        metric: LogstashMetric.getMetricFields(),
      }),
      collapse: {
        field: 'logstash_stats.logstash.uuid',
      },
      sort: [{ timestamp: { order: 'desc', unmapped_type: 'long' } }],
      _source: [
        'timestamp',
        '@timestamp',
        'logstash_stats.process.cpu.percent',
        'logstash.node.stats.process.cpu.percent',
        'logstash_stats.jvm.mem.heap_used_percent',
        'logstash.node.stats.jvm.mem.heap_used_percent',
        'logstash_stats.os.cpu.load_average.1m',
        'logstash.node.stats.os.cpu.load_average.1m',
        'logstash_stats.events.out',
        'logstash.node.stats.events.out',
        'logstash_stats.logstash.http_address',
        'logstash.node.stats.logstash.http_address',
        'logstash_stats.logstash.name',
        'logstash.node.stats.logstash.name',
        'logstash_stats.logstash.host',
        'logstash.node.stats.logstash.host',
        'logstash_stats.logstash.uuid',
        'logstash.node.stats.logstash.uuid',
        'logstash_stats.logstash.status',
        'logstash.node.stats.logstash.status',
        'logstash_stats.logstash.pipeline',
        'logstash.node.stats.logstash.pipeline',
        'logstash_stats.reloads',
        'logstash.node.stats.reloads',
        'logstash_stats.logstash.version',
        'logstash.node.stats.logstash.version',
      ],
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const response: ElasticsearchResponse = await callWithRequest(req, 'search', params);
  return response.hits?.hits.map((hit) => {
    const legacyStats = hit._source.logstash_stats;
    const mbStats = hit._source.logstash?.node?.stats;

    const logstash: Logstash = {
      logstash: mbStats?.logstash ?? legacyStats?.logstash,
      jvm: {
        mem: {
          heap_used_percent:
            mbStats?.jvm?.mem?.heap_used_percent ?? legacyStats?.jvm?.mem?.heap_used_percent,
        },
      },
      process: {
        cpu: {
          percent: mbStats?.process?.cpu?.percent ?? legacyStats?.process?.cpu?.percent,
        },
      },
      os: {
        cpu: {
          load_average: {
            '1m':
              mbStats?.os?.cpu?.load_average?.['1m'] ?? legacyStats?.os?.cpu?.load_average?.['1m'],
          },
        },
      },
      events: {
        out: mbStats?.events?.out ?? legacyStats?.events?.out,
      },
      reloads: {
        failures: mbStats?.reloads?.failures ?? legacyStats?.reloads?.failures,
        successes: mbStats?.reloads?.successes ?? legacyStats?.reloads?.successes,
      },
      availability: calculateAvailability(hit._source['@timestamp'] ?? hit._source.timestamp),
    };

    return logstash;
  });
}
