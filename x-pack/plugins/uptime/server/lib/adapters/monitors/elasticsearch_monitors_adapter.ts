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
  MonitorChart,
  MonitorKey,
  MonitorPageTitle,
  MonitorSeriesPoint,
  Ping,
} from '../../../../common/graphql/types';
import {
  dropLatestBucket,
  getFilteredQuery,
  getFilteredQueryAndStatusFilter,
  getHistogramInterval,
} from '../../helper';
import { DatabaseAdapter } from '../database';
import { UMMonitorsAdapter } from './adapter_types';

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
    dateRangeEnd: string,
    location?: string | null
  ): Promise<MonitorChart> {
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        query: {
          bool: {
            filter: [
              { range: { '@timestamp': { gte: dateRangeStart, lte: dateRangeEnd } } },
              { term: { 'monitor.id': monitorId } },
              // if location is truthy, add it as a filter. otherwise add nothing
              ...(!!location ? [{ term: { 'observer.geo.name': location } }] : []),
            ],
          },
        },
        size: 0,
        aggs: {
          timeseries: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: getHistogramInterval(dateRangeStart, dateRangeEnd),
            },
            aggs: {
              status: { terms: { field: 'monitor.status', size: 2, shard_size: 2 } },
              duration: { stats: { field: 'monitor.duration.us' } },
            },
          },
        },
      },
    };

    const result = await this.database.search(request, params);
    const buckets = dropLatestBucket(get(result, 'aggregations.timeseries.buckets', []));

    /**
     * The code below is responsible for formatting the aggregation data we fetched above in a way
     * that the chart components used by the client understands.
     * There are five required values. Two are lists of points that conform to a simple (x,y) structure.
     *
     * The third list is for an area chart expressing a range, and it requires an (x,y,y0) structure,
     * where y0 is the min value for the point and y is the max.
     *
     * Additionally, we supply the maximum value for duration and status, so the corresponding charts know
     * what the domain size should be.
     */
    const monitorChartsData: MonitorChart = {
      durationArea: [],
      durationLine: [],
      status: [],
      durationMaxValue: 0,
      statusMaxCount: 0,
    };

    buckets.forEach(bucket => {
      const x = get(bucket, 'key');
      const docCount = get(bucket, 'doc_count', 0);
      // update the maximum value for each point
      monitorChartsData.statusMaxCount = Math.max(docCount, monitorChartsData.statusMaxCount);
      monitorChartsData.durationMaxValue = Math.max(
        monitorChartsData.durationMaxValue,
        get(bucket, 'duration.max', 0)
      );

      // these points express a range that will be displayed as an area chart
      monitorChartsData.durationArea.push({
        x,
        yMin: get(bucket, 'duration.min', null),
        yMax: get(bucket, 'duration.max', null),
      });
      monitorChartsData.durationLine.push({ x, y: get(bucket, 'duration.avg', null) });
      monitorChartsData.status.push(
        formatStatusBuckets(x, get(bucket, 'status.buckets', []), docCount)
      );
    });
    return monitorChartsData;
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
                {
                  location: {
                    terms: {
                      field: 'observer.geo.name',
                      missing_bucket: true,
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
                {
                  location: {
                    terms: {
                      field: 'observer.geo.name',
                      missing_bucket: true,
                    },
                  },
                },
              ],
              size: 40,
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
                date_histogram: {
                  field: '@timestamp',
                  fixed_interval: getHistogramInterval(dateRangeStart, dateRangeEnd),
                  missing: 0,
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
        _source: [
          'monitor.id',
          'monitor.type',
          'url.full',
          'url.port',
          'monitor.name',
          'observer.geo.name',
        ],
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
    const locations = new Set<string>();

    const hits = get(result, 'hits.hits', []);
    hits.forEach((hit: any) => {
      const key: string = get(hit, '_source.monitor.id');
      const url: string | null = get(hit, '_source.url.full', null);
      const port: number | undefined = get(hit, '_source.url.port', undefined);
      const type: string | undefined = get(hit, '_source.monitor.type', undefined);
      const name: string | null = get(hit, '_source.monitor.name', null);
      const location: string | null = get(hit, '_source.observer.geo.name', null);

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
      if (location) {
        locations.add(location);
      }
    });

    return {
      ids,
      locations: Array.from(locations),
      names: Array.from(names),
      ports: Array.from(ports),
      schemes: Array.from(types),
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
          errors: {
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
                  error_type: {
                    terms: {
                      field: 'error.type',
                    },
                  },
                },
                {
                  location: {
                    terms: {
                      field: 'observer.geo.name',
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
                      '@timestamp': {
                        order: 'desc',
                      },
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
    const result = await this.database.search(request, params);
    const buckets = get(result, 'aggregations.errors.buckets', []);

    const errorsList: ErrorListItem[] = [];
    buckets.forEach((bucket: any) => {
      const count = get<number>(bucket, 'doc_count', 0);
      const monitorId = get<string | null>(bucket, 'key.id', null);
      const errorType = get<string | null>(bucket, 'key.error_type', null);
      const location = get<string | null>(bucket, 'key.location', null);
      const source = get<string | null>(bucket, 'latest.hits.hits[0]._source', null);
      const errorMessage = get(source, 'error.message', null);
      const statusCode = get(source, 'http.response.status_code', null);
      const timestamp = get(source, '@timestamp', null);
      const name = get(source, 'monitor.name', null);
      errorsList.push({
        count,
        latestMessage: errorMessage,
        location,
        monitorId,
        name: name === '' ? null : name,
        statusCode,
        timestamp,
        type: errorType || '',
      });
    });
    return errorsList.sort(({ count: A }, { count: B }) => B - A);
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
