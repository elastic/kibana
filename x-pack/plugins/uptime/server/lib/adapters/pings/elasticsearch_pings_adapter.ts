/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import moment from 'moment';
import { INDEX_NAMES } from '../../../../common/constants';
import { DocCount, HistogramDataPoint, Ping, PingResults } from '../../../../common/graphql/types';
import { formatEsBucketsForHistogram, getFilteredQueryAndStatusFilter } from '../../helper';
import { DatabaseAdapter, HistogramQueryResult } from '../database';
import { UMPingsAdapter } from './adapter_types';
import { getHistogramInterval } from '../../helper/get_histogram_interval';

export class ElasticsearchPingsAdapter implements UMPingsAdapter {
  private database: DatabaseAdapter;

  constructor(database: DatabaseAdapter) {
    this.database = database;
  }

  /**
   * Fetches ping documents from ES
   * @param request Kibana server request
   * @param dateRangeStart timestamp bounds
   * @param dateRangeEnd timestamp bounds
   * @param monitorId optional limit by monitorId
   * @param status optional limit by check statuses
   * @param sort optional sort by timestamp
   * @param size optional limit query size
   */
  public async getAll(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    monitorId?: string | null,
    status?: string | null,
    sort: string | null = 'desc',
    size?: number | null,
    location?: string | null
  ): Promise<PingResults> {
    const sortParam = { sort: [{ '@timestamp': { order: sort } }] };
    const sizeParam = size ? { size } : undefined;
    const filter: any[] = [{ range: { '@timestamp': { gte: dateRangeStart, lte: dateRangeEnd } } }];
    if (monitorId) {
      filter.push({ term: { 'monitor.id': monitorId } });
    }
    if (status) {
      filter.push({ term: { 'monitor.status': status } });
    }
    if (location) {
      filter.push({ term: { 'observer.geo.name': location } });
    }
    const queryContext = { bool: { filter } };
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        query: {
          ...queryContext,
        },
        ...sortParam,
        ...sizeParam,
      },
    };
    const {
      hits: { hits, total },
    } = await this.database.search(request, params);

    const pings: Ping[] = hits.map(({ _source }: any) => {
      const timestamp = _source['@timestamp'];
      return { timestamp, ..._source };
    });

    const results: PingResults = {
      total: total.value,
      pings,
    };

    return results;
  }

  /**
   * Fetch data to populate monitor status bar.
   * @param request Kibana server request
   * @param dateRangeStart timestamp bounds
   * @param dateRangeEnd timestamp bounds
   * @param monitorId optional limit to monitorId
   */
  public async getLatestMonitorDocs(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    monitorId?: string | null,
    location?: string | null
  ): Promise<Ping[]> {
    // TODO: Write tests for this function
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        query: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': {
                    gte: dateRangeStart,
                    lte: dateRangeEnd,
                  },
                },
              },
              ...(monitorId ? [{ term: { 'monitor.id': monitorId } }] : []),
              ...(location ? [{ term: { 'observer.geo.name': location } }] : []),
            ],
          },
        },
        size: 0,
        aggs: {
          by_id: {
            terms: {
              field: 'monitor.id',
              size: 1000,
            },
            aggs: {
              latest: {
                top_hits: {
                  size: 1,
                  sort: {
                    '@timestamp': { order: 'desc' },
                  },
                },
              },
            },
          },
        },
      },
    };

    const result = await this.database.search(request, params);
    const buckets: any[] = get(result, 'aggregations.by_id.buckets', []);

    // @ts-ignore TODO fix destructuring implicit any
    return buckets.map(({ latest: { hits: { hits } } }) => {
      const timestamp = hits[0]._source[`@timestamp`];
      const momentTs = moment(timestamp);
      const millisFromNow = moment().diff(momentTs);
      return {
        ...hits[0]._source,
        timestamp,
        millisFromNow,
      };
    });
  }

  /**
   * Gets data used for a composite histogram for the currently-running monitors.
   * @param request Kibana server request
   * @param dateRangeStart timestamp bounds
   * @param dateRangeEnd timestamp bounds
   * @param filters user-defined filters
   */
  public async getPingHistogram(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    filters?: string | null
  ): Promise<HistogramDataPoint[]> {
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
          timeseries: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: getHistogramInterval(dateRangeStart, dateRangeEnd),
            },
            aggs: {
              down: {
                filter: {
                  term: {
                    'monitor.status': 'down',
                  },
                },
                aggs: {
                  bucket_count: {
                    cardinality: {
                      field: 'monitor.id',
                    },
                  },
                },
              },
              bucket_total: {
                cardinality: {
                  field: 'monitor.id',
                  precision_threshold: 20000,
                },
              },
            },
          },
        },
      },
    };

    const result = await this.database.search(request, params);
    const buckets: HistogramQueryResult[] = get(result, 'aggregations.timeseries.buckets', []);
    const mappedBuckets = buckets.map(bucket => {
      const key: number = get(bucket, 'key');
      const total: number = get(bucket, 'bucket_total.value');
      const downCount: number = get(bucket, 'down.bucket_count.value');
      return {
        key,
        downCount: statusFilter && statusFilter !== 'down' ? 0 : downCount,
        upCount: statusFilter && statusFilter !== 'up' ? 0 : total - downCount,
        y: 1,
      };
    });

    return formatEsBucketsForHistogram(mappedBuckets);
  }

  /**
   * Count the number of documents in heartbeat indices
   * @param request Kibana server request
   */
  public async getDocCount(request: any): Promise<DocCount> {
    const { count } = await this.database.count(request, { index: INDEX_NAMES.HEARTBEAT });

    return { count };
  }
}
