/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, set } from 'lodash';
import { INDEX_NAMES } from '../../../../common/constants';
import { UMGqlRange } from '../../../../common/domain_types';
import { ErrorListItem } from '../../../../common/graphql/types';
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

const getFilteredQuery = (dateRangeStart: number, dateRangeEnd: number, filters?: string) => {
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
    dateRangeStart: number,
    dateRangeEnd: number
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
    range: UMGqlRange,
    downCount: number,
    windowSize: number,
    filters: string = ''
  ): Promise<any> {
    const { dateRangeStart, dateRangeEnd } = range;
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        query: getFilteredQuery(dateRangeStart, dateRangeEnd, filters),
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
    // TODO: this doesn't solve the issue of HB being down
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

  public async getLatestMonitors(
    request: any,
    dateRangeStart: number,
    dateRangeEnd: number,
    filters: string
  ): Promise<any> {
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        query: getFilteredQuery(dateRangeStart, dateRangeEnd, filters),
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
    });
    return result;
  }

  public async getFilterBar(
    request: any,
    dateRangeStart: number,
    dateRangeEnd: number
  ): Promise<any> {
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        query: {
          range: {
            '@timestamp': {
              gte: dateRangeStart,
              lte: dateRangeEnd,
            },
          },
        },
        aggs: {
          id: {
            terms: {
              field: 'monitor.id',
            },
          },
          port: {
            terms: {
              field: 'tcp.port',
            },
          },
          scheme: {
            terms: {
              field: 'monitor.scheme',
            },
          },
          status: {
            terms: {
              field: 'monitor.status',
            },
          },
        },
      },
    };
    const {
      aggregations: { scheme, port, id, status },
    } = await this.database.search(request, params);

    // TODO update typings
    const getKey = (list: { buckets: any[] }) => list.buckets.map(value => value.key);
    return {
      scheme: getKey(scheme),
      port: getKey(port),
      id: getKey(id),
      status: getKey(status),
    };
  }

  public async getErrorsList(
    request: any,
    dateRangeStart: number,
    dateRangeEnd: number,
    filters?: string | undefined
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
    const {
      aggregations: {
        error_type: { buckets },
      },
    } = await this.database.search(request, params);

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
}
