/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
// @ts-ignore
import { checkParam } from '../error_missing_required';
// @ts-ignore
import { createQuery } from '../create_query';
// @ts-ignore
import { calculateAvailability } from '../calculate_availability';
// @ts-ignore
import { KibanaMetric } from '../metrics';
import { LegacyRequest } from '../../types';
import { ElasticsearchResponse } from '../../../common/types/es';

interface Kibana {
  process?: {
    memory?: {
      resident_set_size_in_bytes?: number;
    };
  };
  os?: {
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
  concurrent_connections?: number;
  kibana?: {
    transport_address?: string;
    name?: string;
    host?: string;
    uuid?: string;
    status?: string;
  };
  availability: boolean;
}

/*
 * Get detailed info for Kibanas in the cluster
 * for Kibana listing page
 * For each instance:
 *  - name
 *  - status
 *  - memory
 *  - os load average
 *  - requests
 *  - response times
 */
export async function getKibanas(
  req: LegacyRequest,
  kbnIndexPattern: string,
  { clusterUuid }: { clusterUuid: string }
) {
  checkParam(kbnIndexPattern, 'kbnIndexPattern in getKibanas');

  const config = req.server.config();
  const start = moment.utc(req.payload.timeRange.min).valueOf();
  const end = moment.utc(req.payload.timeRange.max).valueOf();

  const params = {
    index: kbnIndexPattern,
    size: config.get('monitoring.ui.max_bucket_size'),
    ignore_unavailable: true,
    body: {
      query: createQuery({
        types: ['kibana_stats', 'stats'],
        start,
        end,
        clusterUuid,
        metric: KibanaMetric.getMetricFields(),
      }),
      collapse: {
        field: 'kibana_stats.kibana.uuid',
      },
      sort: [{ timestamp: { order: 'desc', unmapped_type: 'long' } }],
      _source: [
        'timestamp',
        '@timestamp',
        'kibana_stats.process.memory.resident_set_size_in_bytes',
        'kibana.stats.process.memory.resident_set_size.bytes',
        'kibana_stats.os.load.1m',
        'kibana.stats.os.load.1m',
        'kibana_stats.response_times.average',
        'kibana.stats.response_time.avg.ms',
        'kibana_stats.response_times.max',
        'kibana.stats.response_time.max.ms',
        'kibana_stats.requests.total',
        'kibana.stats.request.total',
        'kibana_stats.kibana.transport_address',
        'kibana.kibana.transport_address',
        'kibana_stats.kibana.name',
        'kibana.kibana.name',
        'kibana_stats.kibana.host',
        'kibana.kibana.host',
        'kibana_stats.kibana.uuid',
        'kibana.kibana.uuid',
        'kibana_stats.kibana.status',
        'kibana.kibana.status',
        'kibana_stats.concurrent_connections',
        'kibana.stats.concurrent_connections',
      ],
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const response: ElasticsearchResponse = await callWithRequest(req, 'search', params);
  const instances = response.hits?.hits ?? [];

  return instances.map((hit) => {
    const legacyStats = hit._source.kibana_stats;
    const mbStats = hit._source.kibana?.stats;

    const kibana: Kibana = {
      kibana: hit._source.kibana?.kibana ?? legacyStats?.kibana,
      concurrent_connections:
        mbStats?.concurrent_connections ?? legacyStats?.concurrent_connections,
      process: {
        memory: {
          resident_set_size_in_bytes:
            mbStats?.process?.memory?.resident_set_size?.bytes ??
            legacyStats?.process?.memory?.resident_set_size_in_bytes,
        },
      },
      os: {
        load: {
          '1m': mbStats?.os?.load?.['1m'] ?? legacyStats?.os?.load?.['1m'],
        },
      },
      response_times: {
        average: mbStats?.response_time?.avg?.ms ?? legacyStats?.response_times?.average,
        max: mbStats?.response_time?.max?.ms ?? legacyStats?.response_times?.max,
      },
      requests: {
        total: mbStats?.request?.total ?? legacyStats?.requests?.total,
      },
      availability: calculateAvailability(hit._source['@timestamp'] ?? hit._source.timestamp),
    };
    return kibana;
  });
}
