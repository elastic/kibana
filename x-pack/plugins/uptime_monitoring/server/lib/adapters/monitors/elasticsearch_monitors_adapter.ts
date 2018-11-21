/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { UMGqlRange } from 'x-pack/plugins/uptime_monitoring/common/domain_types';
import { INDEX_NAMES } from '../../../../common/constants';
import { DatabaseAdapter } from '../database';
import { UMMonitorsAdapter } from './adapter_types';

export class ElasticsearchMonitorsAdapter implements UMMonitorsAdapter {
  constructor(private readonly database: DatabaseAdapter) {
    this.database = database;
  }

  public async getSnapshotCount(
    request: any,
    range: UMGqlRange,
    downCount: number,
    windowSize: number
  ): Promise<any> {
    const { start, end } = range;
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        query: {
          range: {
            '@timestamp': {
              gte: start,
              lte: end,
            },
          },
        },
        aggs: {
          hosts: {
            composite: {
              sources: [
                {
                  id: {
                    terms: {
                      field: 'monitor.id',
                    },
                  },
                },
                {
                  port: {
                    terms: {
                      field: 'tcp.port',
                    },
                  },
                },
              ],
            },
            aggs: {
              latest: {
                top_hits: {
                  sort: [
                    {
                      '@timestamp': { order: 'desc' },
                    },
                  ],
                  size: windowSize,
                },
              },
            },
          },
        },
      },
    };
    // NOTE: this doesn't solve the issue of HB being down
    const res = await this.database.search(request, params);
    const hostBuckets = get(res, 'aggregations.hosts.buckets', []);
    const monitorStatuses = hostBuckets.map(bucket => {
      const latest = get(bucket, 'latest.hits.hits', []);
      return latest.reduce(
        (acc, doc) => {
          const status = get(doc, '_source.monitor.status', null);
          if (status === 'up') {
            acc.up += 1;
          } else {
            acc.down += 1;
          }
          return acc;
        },
        { up: 0, down: 0 }
      );
    });
    // console.log(JSON.stringify(monitorStatuses, null, 2));
    const { up, down, trouble } = monitorStatuses.reduce(
      (acc, status) => {
        if (status.down === 0 && status.up === windowSize) {
          acc.up += 1;
        } else if (status.down >= downCount) {
          acc.down += 1;
        } else {
          // @ts-ignore TODO update typings and remove this comment
          acc.trouble += 1;
        }
        return acc;
      },
      // @ts-ignore TODO update typings and remove this comment
      { up: 0, down: 0, trouble: 0 }
    );
    return { up, down, trouble, total: up + down + trouble };
  }

  public async getLatestMonitors(request: any, range: UMGqlRange): Promise<any> {
    const { start, end } = range;
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        query: {
          range: {
            '@timestamp': {
              gte: start,
              lte: end,
            },
          },
        },
        aggs: {
          hosts: {
            composite: {
              sources: [
                {
                  id: {
                    terms: {
                      field: 'monitor.id',
                    },
                  },
                },
                {
                  port: {
                    terms: {
                      field: 'tcp.port',
                    },
                  },
                },
              ],
            },
            aggs: {
              latest: {
                top_hits: {
                  sort: [
                    {
                      '@timestamp': { order: 'desc' },
                    },
                  ],
                  size: 1,
                },
              },
              histogram: {
                auto_date_histogram: {
                  field: '@timestamp',
                  buckets: 50,
                },
                aggs: {
                  status: {
                    terms: {
                      field: 'monitor.status',
                      size: 10,
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    const res = await this.database.search(request, params);
    const aggBuckets: any[] = get(res, 'aggregations.hosts.buckets', []);
    const result = aggBuckets.map(({ key, histogram: { buckets }, latest: { hits: { hits } } }) => {
      const upSeries: any[] = [];
      const downSeries: any[] = [];
      // @ts-ignore TODO update typings and remove this comment
      buckets.forEach(bucket => {
        const status = get(bucket, 'status.buckets', []);
        // @ts-ignore TODO update typings and remove this comment
        const up = status.find(f => f.key === 'up');
        // @ts-ignore TODO update typings and remove this comment
        const down = status.find(f => f.key === 'down');
        // @ts-ignore TODO update typings and remove this comment
        upSeries.push({ x: bucket.key, y: up ? up.doc_count : 0 });
        // @ts-ignore TODO update typings and remove this comment
        downSeries.push({ x: bucket.key, y: down ? down.doc_count : 0 });
      });
      return {
        key,
        ping: {
          ...hits[0]._source,
          timestamp: hits[0]._source['@timestamp'],
        },
        upSeries,
        downSeries,
      };
    });
    return result;
  }
}
