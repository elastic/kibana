/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, set } from 'lodash';
import { INDEX_NAMES } from '../../../../common/constants';
import { ErrorListItem } from '../../../../common/graphql/types';
import { getFilteredQueryAndStatusFilter } from '../../helper';
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

const getFilteredQuery = (
  dateRangeStart: string,
  dateRangeEnd: string,
  filters?: string | null
) => {
  let filtersObj;
  // TODO: handle bad JSON gracefully
  filtersObj = filters ? JSON.parse(filters) : undefined;
  const query = { ...filtersObj };
  const rangeSection = {
    range: {
      '@timestamp': {
        gte: dateRangeStart,
        lte: dateRangeEnd,
      },
    },
  };
  if (get(query, 'bool.must', undefined)) {
    query.bool.must.push({
      ...rangeSection,
    });
  } else {
    set(query, 'bool.must', [rangeSection]);
  }
  return query;
};

export class ElasticsearchMonitorsAdapter implements UMMonitorsAdapter {
  constructor(private readonly database: DatabaseAdapter) {
    this.database = database;
  }

  public async getMonitorChartsData(
    request: any,
    monitorId: string,
    dateRangeStart: string,
    dateRangeEnd: string
  ): Promise<any> {
    const query = {
      bool: {
        must: [{ term: { 'monitor.id': monitorId } }],
        filter: [{ range: { '@timestamp': { gte: dateRangeStart, lte: dateRangeEnd } } }],
      },
    };
    const aggs = {
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
          status: { terms: { field: 'monitor.status' } },
          max_duration: { max: { field: 'monitor.duration.us' } },
          min_duration: { min: { field: 'monitor.duration.us' } },
          avg_duration: { avg: { field: 'monitor.duration.us' } },
        },
      },
    };
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: { query, aggs },
    };

    const {
      aggregations: {
        timeseries: { buckets },
      },
    } = await this.database.search(request, params);

    return buckets.map(
      ({
        key,
        max_content,
        avg_duration,
        max_write_request,
        max_validate,
        max_tcp_rtt,
        max_response,
        min_duration,
        max_total,
        max_duration,
        status,
        doc_count,
      }: any) => {
        return {
          maxContent: formatChartValue(key, max_content),
          avgDuration: formatChartValue(key, avg_duration),
          maxWriteRequest: formatChartValue(key, max_write_request),
          maxValidate: formatChartValue(key, max_validate),
          maxTcpRtt: formatChartValue(key, max_tcp_rtt),
          maxResponse: formatChartValue(key, max_response),
          minDuration: formatChartValue(key, min_duration),
          maxTotal: formatChartValue(key, max_total),
          maxDuration: formatChartValue(key, max_duration),
          status: formatStatusBuckets(key, status.buckets, doc_count),
        };
      }
    );
  }

  public async getSnapshotCount(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    filter?: string | null
  ): Promise<any> {
    const { statusFilter, query } = getFilteredQueryAndStatusFilter(
      dateRangeStart,
      dateRangeEnd,
      filter
    );
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        query,
        size: 0,
        aggs: {
          ids: {
            composite: {
              sources: [
                {
                  id: {
                    terms: {
                      field: 'monitor.id',
                    },
                  },
                },
              ],
              size: 10000,
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

    let up: number = 0;
    let down: number = 0;
    let searchAfter: any = null;

    do {
      if (searchAfter) {
        set(params, 'body.aggs.ids.composite.after', searchAfter);
      }

      const queryResult = await this.database.search(request, params);
      const idBuckets = get(queryResult, 'aggregations.ids.buckets', []);

      idBuckets.forEach(bucket => {
        // We only get the latest doc
        const status = get(bucket, 'latest.hits.hits[0]._source.monitor.status', null);
        if (!statusFilter || (statusFilter && statusFilter === status)) {
          if (status === 'up') {
            up++;
          } else {
            down++;
          }
        }
      });

      searchAfter = get(queryResult, 'aggregations.ids.after_key');
    } while (searchAfter);

    return { up, down, total: up + down };
  }

  public async getLatestMonitors(
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
        size: 0,
        query,
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
                      missing_bucket: true,
                    },
                  },
                },
              ],
              size: 50,
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

    const httpTcpResult = await this.database.search(request, params);
    const result = get(httpTcpResult, 'aggregations.hosts.buckets', [])
      .map((resultBucket: any) => {
        const key = get(resultBucket, 'key');
        const buckets: any[] = get(resultBucket, 'histogram.buckets', []);
        const hits: any[] = get(resultBucket, 'latest.hits.hits', []);
        const latestStatus: string | undefined = get(hits, '[0]._source.monitor.status', undefined);
        if (statusFilter && latestStatus !== statusFilter) {
          return undefined;
        }
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
          upSeries.push({ x: bucket.key, y: up ? up.doc_count : null });
          // @ts-ignore TODO update typings and remove this comment
          downSeries.push({ x: bucket.key, y: down ? down.doc_count : null });
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
      })
      .filter((f: any) => f !== undefined);
    return result;
  }

  public async getFilterBar(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string
  ): Promise<any> {
    const MONITOR_SOURCE_ID_KEY = 'monitor.id';
    const MONITOR_SOURCE_TCP_KEY = 'tcp.port';
    const MONITOR_SOURCE_TYPE_KEY = 'monitor.type';
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        _source: [MONITOR_SOURCE_ID_KEY, MONITOR_SOURCE_TCP_KEY, MONITOR_SOURCE_TYPE_KEY],
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
    const ids: string[] = [];
    const ports = new Set<number>();
    const types = new Set<string>();

    const hits = get(result, 'hits.hits', []);
    hits.forEach((hit: any) => {
      const key: string = get(hit, `_source.${MONITOR_SOURCE_ID_KEY}`);
      const portValue: number | undefined = get(
        hit,
        `_source.${MONITOR_SOURCE_TCP_KEY}`,
        undefined
      );
      const typeValue: string | undefined = get(
        hit,
        `_source.${MONITOR_SOURCE_TYPE_KEY}`,
        undefined
      );

      if (key) {
        ids.push(key);
      }
      if (portValue) {
        ports.add(portValue);
      }
      if (typeValue) {
        types.add(typeValue);
      }
    });

    return {
      type: Array.from(types).sort(),
      port: Array.from(ports).sort((a: number, b: number) => a - b),
      id: ids.sort(),
      status: ['up', 'down'],
    };
  }

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
    if (get(query, 'bool.must', undefined)) {
      query.bool.must.push(statusDown);
    } else {
      set(query, 'bool.must', [{ ...statusDown }]);
    }

    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        query,
        aggs: {
          error_type: {
            terms: {
              field: 'error.type',
            },
            aggs: {
              by_id: {
                terms: {
                  field: 'monitor.id',
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

    const queryResult = await this.database.search(request, params);
    const errorsList: ErrorListItem[] = [];
    get(queryResult, 'aggregations.error_type.buckets', []).forEach(
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
          const monitorType = get(source, 'monitor.type', null);
          errorsList.push({
            latestMessage: errorMessage,
            monitorId,
            type: errorType,
            monitorType,
            count,
            statusCode,
            timestamp,
          });
        });
      }
    );
    return errorsList;
  }
}
