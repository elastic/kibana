/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, set } from 'lodash';
import { INDEX_NAMES } from '../../../../common/constants';
import {
  ErrorListItem,
  FilterBar,
  LatestMonitor,
  MonitorKey,
  MonitorPageTitle,
  MonitorSeriesPoint,
  Ping,
} from '../../../../common/graphql/types';
import { getFilteredQuery, getFilteredQueryAndStatusFilter } from '../../helper';
import { DatabaseAdapter } from '../database';
import { UMMonitorsAdapter } from './adapter_types';

// the values for these charts are stored as μs, but should be displayed as ms
const formatChartValue = (time: any, chartPoint: any) => ({
  x: time,
  y: chartPoint.value === null ? null : chartPoint.value / 1000,
});

const formatStatusBuckets = (time: any, buckets: any, docCount: any) => {
  let up = null;
  let down = null;

  buckets.forEach((bucket: any) => {
    if (bucket.key === 'up') {
      up = bucket.doc_count;
    } else if (bucket.key === 'down') {
      down = bucket.doc_count;
    }
  });

  return {
    x: time,
    up,
    down,
    total: docCount,
  };
};

export class ElasticsearchMonitorsAdapter implements UMMonitorsAdapter {
  constructor(private readonly database: DatabaseAdapter) {
    this.database = database;
  }

  /**
   * Fetches data used to populate monitor charts
   * @param request Kibana request
   * @param monitorId ID value for the selected monitor
   * @param dateRangeStart timestamp bounds
   * @param dateRangeEnd timestamp bounds
   */
  public async getMonitorChartsData(
    request: any,
    monitorId: string,
    dateRangeStart: string,
    dateRangeEnd: string
  ): Promise<any> {
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        query: {
          bool: {
            filter: [
              { range: { '@timestamp': { gte: dateRangeStart, lte: dateRangeEnd } } },
              { term: { 'monitor.id': monitorId } },
            ],
          },
        },
        size: 0,
        aggs: {
          timeseries: {
            auto_date_histogram: {
              field: '@timestamp',
              buckets: 50,
            },
            aggs: {
              max_content: { max: { field: 'http.rtt.content.us' } },
              max_response: { max: { field: 'http.rtt.response_header.us' } },
              max_validate: { max: { field: 'http.rtt.validate.us' } },
              max_total: { max: { field: 'http.rtt.total.us' } },
              max_write_request: { max: { field: 'http.rtt.write_request.us' } },
              max_tcp_rtt: { max: { field: 'tcp.rtt.connect.us' } },
              status: { terms: { field: 'monitor.status', size: 2, shard_size: 2 } },
              duration: { stats: { field: 'monitor.duration.us' } },
            },
          },
        },
      },
    };

    const result = await this.database.search(request, params);
    const buckets = get(result, 'aggregations.timeseries.buckets', []);

    return buckets.map(
      ({
        key,
        max_content,
        duration: { avg, max, min },
        max_write_request,
        max_validate,
        max_tcp_rtt,
        max_response,
        max_total,
        status,
        doc_count,
      }: any) => ({
        maxContent: formatChartValue(key, max_content),
        maxWriteRequest: formatChartValue(key, max_write_request),
        maxValidate: formatChartValue(key, max_validate),
        maxTcpRtt: formatChartValue(key, max_tcp_rtt),
        maxResponse: formatChartValue(key, max_response),
        maxTotal: formatChartValue(key, max_total),
        avgDuration: formatChartValue(key, { value: avg }),
        maxDuration: formatChartValue(key, { value: max }),
        minDuration: formatChartValue(key, { value: min }),
        status: formatStatusBuckets(key, status.buckets, doc_count),
      })
    );
  }

  /**
   * Provides a count of the current monitors
   * @param request Kibana request
   * @param dateRangeStart timestamp bounds
   * @param dateRangeEnd timestamp bounds
   * @param filters filters defined by client
   */
  public async getSnapshotCount(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    filters?: string | null
  ): Promise<any> {
    const { statusFilter, query } = getFilteredQueryAndStatusFilter(
      dateRangeStart,
      dateRangeEnd,
      filters
    );
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        query,
        size: 0,
        aggs: {
          urls: {
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
                      field: 'url.full',
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
            },
          },
        },
      },
    };

    const queryResult = await this.database.search(request, params);
    const hostBuckets = get(queryResult, 'aggregations.urls.buckets', []);
    const monitorStatuses = hostBuckets.map(bucket => {
      const latest = get(bucket, 'latest.hits.hits', []);
      return latest.reduce(
        (acc, doc) => {
          const status = get(doc, '_source.monitor.status', null);
          if (statusFilter && statusFilter !== status) {
            return acc;
          }
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
    const { up, down } = monitorStatuses.reduce(
      (acc, status) => {
        acc.up += status.up;
        acc.down += status.down;
        return acc;
      },
      // @ts-ignore TODO update typings and remove this comment
      { up: 0, down: 0 }
    );
    return { up, down, total: up + down };
  }

  /**
   * Fetch the latest status for a monitors list
   * @param request Kibana request
   * @param dateRangeStart timestamp bounds
   * @param dateRangeEnd timestamp bounds
   * @param filters filters defined by client
   */
  public async getMonitors(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    filters?: string | null
  ): Promise<LatestMonitor[]> {
    const { statusFilter, query } = getFilteredQueryAndStatusFilter(
      dateRangeStart,
      dateRangeEnd,
      filters
    );
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        query,
        size: 0,
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
                  url: {
                    terms: {
                      field: 'url.full',
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
                  buckets: 25,
                },
                aggs: {
                  status: {
                    terms: {
                      field: 'monitor.status',
                      size: 2,
                      shard_size: 2,
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    const queryResult = await this.database.search(request, params);
    const aggBuckets: any[] = get(queryResult, 'aggregations.hosts.buckets', []);
    const latestMonitors: LatestMonitor[] = aggBuckets
      .filter(
        bucket =>
          (statusFilter &&
            get(bucket, 'latest.hits.hits[0]._source.monitor.status', undefined) ===
              statusFilter) ||
          !statusFilter
      )
      .map(
        (bucket): LatestMonitor => {
          const key: string = get(bucket, 'key.id');
          const url: string | null = get(bucket, 'key.url', null);
          const upSeries: MonitorSeriesPoint[] = [];
          const downSeries: MonitorSeriesPoint[] = [];
          const histogramBuckets: any[] = get(bucket, 'histogram.buckets', []);
          const ping: Ping = get(bucket, 'latest.hits.hits[0]._source');
          const timestamp: string = get(bucket, 'latest.hits.hits[0]._source.@timestamp');
          histogramBuckets.forEach(histogramBucket => {
            const status = get(histogramBucket, 'status.buckets', []);
            // @ts-ignore TODO update typings and remove this comment
            const up = status.find(f => f.key === 'up');
            // @ts-ignore TODO update typings and remove this comment
            const down = status.find(f => f.key === 'down');
            // @ts-ignore TODO update typings and remove this comment
            upSeries.push({ x: histogramBucket.key, y: up ? up.doc_count : null });
            // @ts-ignore TODO update typings and remove this comment
            downSeries.push({ x: histogramBucket.key, y: down ? down.doc_count : null });
          });
          return {
            id: { key, url },
            ping: {
              ...ping,
              timestamp,
            },
            upSeries,
            downSeries,
          };
        }
      );

    return latestMonitors;
  }

  /**
   * Fetch options for the filter bar.
   * @param request Kibana request object
   * @param dateRangeStart timestamp bounds
   * @param dateRangeEnd timestamp bounds
   */
  public async getFilterBar(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string
  ): Promise<FilterBar> {
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        _source: ['monitor.id', 'monitor.type', 'url.full', 'url.port', 'monitor.name'],
        size: 1000,
        query: {
          range: {
            '@timestamp': {
              gte: dateRangeStart,
              lte: dateRangeEnd,
            },
          },
        },
        collapse: {
          field: 'monitor.id',
        },
        sort: {
          '@timestamp': 'desc',
        },
      },
    };
    const result = await this.database.search(request, params);
    const ids: MonitorKey[] = [];
    const ports = new Set<number>();
    const types = new Set<string>();
    const names = new Set<string>();

    const hits = get(result, 'hits.hits', []);
    hits.forEach((hit: any) => {
      const key: string = get(hit, '_source.monitor.id');
      const url: string | null = get(hit, '_source.url.full', null);
      const port: number | undefined = get(hit, '_source.url.port', undefined);
      const type: string | undefined = get(hit, '_source.monitor.type', undefined);
      const name: string | null = get(hit, '_source.monitor.name', null);

      if (key) {
        ids.push({ key, url });
      }
      if (port) {
        ports.add(port);
      }
      if (type) {
        types.add(type);
      }
      if (name) {
        names.add(name);
      }
    });

    return {
      ids,
      ports: Array.from(ports),
      schemes: Array.from(types),
      names: Array.from(names),
      statuses: ['up', 'down'],
    };
  }

  /**
   * Fetch summaries of recent errors for monitors.
   * @example getErrorsList({}, 'now-15m', 'now', '{bool: { must: [{'term': {'monitor.status': {value: 'down'}}}]}})
   * @param request Request to send ES
   * @param dateRangeStart timestamp bounds
   * @param dateRangeEnd timestamp bounds
   * @param filters any filters specified on the client
   */
  public async getErrorsList(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    filters?: string | null
  ): Promise<ErrorListItem[]> {
    const statusDown = {
      term: {
        'monitor.status': {
          value: 'down',
        },
      },
    };
    const query = getFilteredQuery(dateRangeStart, dateRangeEnd, filters);
    if (get(query, 'bool.filter', undefined)) {
      query.bool.filter.push(statusDown);
    } else {
      set(query, 'bool.filter', [statusDown]);
    }

    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        query,
        size: 0,
        aggs: {
          error_type: {
            terms: {
              field: 'error.type',
              size: 100,
            },
            aggs: {
              by_id: {
                terms: {
                  field: 'monitor.id',
                  size: 100,
                },
                aggs: {
                  latest: {
                    top_hits: {
                      sort: [{ '@timestamp': { order: 'desc' } }],
                      size: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const result = await this.database.search(request, params);
    const buckets = get(result, 'aggregations.error_type.buckets', []);

    const errorsList: ErrorListItem[] = [];
    buckets.forEach(
      ({
        key: errorType,
        by_id: { buckets: monitorBuckets },
      }: {
        key: string;
        by_id: { buckets: any[] };
      }) => {
        monitorBuckets.forEach(bucket => {
          const count = get(bucket, 'doc_count', null);
          const monitorId = get(bucket, 'key', null);
          const source = get(bucket, 'latest.hits.hits[0]._source', null);
          const errorMessage = get(source, 'error.message', null);
          const statusCode = get(source, 'http.response.status_code', null);
          const timestamp = get(source, '@timestamp', null);
          errorsList.push({
            latestMessage: errorMessage,
            monitorId,
            type: errorType,
            count,
            statusCode,
            timestamp,
          });
        });
      }
    );
    return errorsList;
  }

  /**
   * Fetch data for the monitor page title.
   * @param request Kibana server request
   * @param monitorId the ID to query
   */
  public async getMonitorPageTitle(
    request: any,
    monitorId: string
  ): Promise<MonitorPageTitle | null> {
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        query: {
          bool: {
            filter: {
              term: {
                'monitor.id': monitorId,
              },
            },
          },
        },
        sort: [
          {
            '@timestamp': {
              order: 'desc',
            },
          },
        ],
        size: 1,
      },
    };

    const result = await this.database.search(request, params);
    const pageTitle: Ping | null = get(result, 'hits.hits[0]._source', null);
    if (pageTitle === null) {
      return null;
    }
    return {
      id: get(pageTitle, 'monitor.id', null) || monitorId,
      url: get(pageTitle, 'url.full', null),
      name: get(pageTitle, 'monitor.name', null),
    };
  }
}
