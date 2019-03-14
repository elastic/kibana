/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import moment from 'moment';
import { INDEX_NAMES } from '../../../../common/constants';
import { DocCount, HistogramDataPoint, Ping, PingResults } from '../../../../common/graphql/types';
import { formatEsBucketsForHistogram, getFilterFromMust } from '../../helper';
import { DatabaseAdapter, HistogramQueryResult } from '../database';
import { UMPingsAdapter } from './adapter_types';

export class ElasticsearchPingsAdapter implements UMPingsAdapter {
  private database: DatabaseAdapter;

  constructor(database: DatabaseAdapter) {
    this.database = database;
  }

  public async getAll(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    monitorId?: string | null,
    status?: string | null,
    sort?: string | null,
    size?: number | null
  ): Promise<PingResults> {
    const sortParam = sort ? { sort: [{ '@timestamp': { order: sort } }] } : undefined;
    const sizeParam = size ? { size } : undefined;
    const must: any[] = [];
    if (monitorId) {
      must.push({ term: { 'monitor.id': monitorId } });
    }
    if (status) {
      must.push({ term: { 'monitor.status': status } });
    }
    const filter: any[] = [{ range: { '@timestamp': { gte: dateRangeStart, lte: dateRangeEnd } } }];
    const queryContext = { bool: { must, filter } };
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      rest_total_hits_as_int: true,
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
      total,
      pings,
    };

    return results;
  }

  public async getLatestMonitorDocs(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    monitorId?: string | null
  ): Promise<Ping[]> {
    const must: any[] = [];
    if (monitorId) {
      must.push({ term: { 'monitor.id': monitorId } });
    }
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        query: {
          bool: {
            must: must.length ? [...must] : undefined,
            filter: [
              {
                range: {
                  '@timestamp': {
                    gte: dateRangeStart,
                    lte: dateRangeEnd,
                  },
                },
              },
            ],
          },
        },
        aggs: {
          by_id: {
            terms: {
              field: 'monitor.id',
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
    const {
      aggregations: {
        by_id: { buckets },
      },
    } = await this.database.search(request, params);

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

  public async getPingHistogram(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    filters?: string | null
  ): Promise<HistogramDataPoint[]> {
    const query = getFilterFromMust(dateRangeStart, dateRangeEnd, filters);
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      rest_total_hits_as_int: true,
      body: {
        query,
        size: 0,
        aggs: {
          timeseries: {
            auto_date_histogram: {
              field: '@timestamp',
              buckets: 50,
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
        downCount,
        upCount: total - downCount,
        y: 1,
      };
    });

    return formatEsBucketsForHistogram(mappedBuckets);
  }

  public async getDocCount(request: any): Promise<DocCount> {
    const { count } = await this.database.count(request, { index: INDEX_NAMES.HEARTBEAT });

    return { count };
  }
}
