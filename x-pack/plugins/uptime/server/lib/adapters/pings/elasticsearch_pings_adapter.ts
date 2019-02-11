/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import moment from 'moment';
import { INDEX_NAMES } from '../../../../common/constants';
import { DocCount, HistogramSeries, Ping, PingResults } from '../../../../common/graphql/types';
import { DatabaseAdapter } from '../database';
import { UMPingsAdapter } from './adapter_types';

const getFilteredQuery = (
  dateRangeStart: string,
  dateRangeEnd: string,
  filters?: string | null
) => {
  let filtersObj;
  // TODO: handle bad JSON gracefully
  filtersObj = filters ? JSON.parse(filters) : undefined;
  let query = { ...filtersObj };
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
    query = { ...rangeSection };
  }
  return query;
};

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
  ): Promise<HistogramSeries[] | null> {
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        query: getFilteredQuery(dateRangeStart, dateRangeEnd, filters),
        aggs: {
          timeseries: {
            auto_date_histogram: {
              field: '@timestamp',
              buckets: 50,
            },
            aggs: {
              by_id: {
                terms: {
                  field: 'monitor.id',
                },
                aggs: {
                  status: {
                    terms: {
                      field: 'monitor.status',
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
        timeseries: { buckets },
      },
    } = await this.database.search(request, params);

    if (buckets.length === 0) {
      return null;
    }
    const defaultBucketSize = Math.abs(buckets[0].key - buckets[1].key);
    const ret: Array<{ monitorId: string; data: any[] }> = [];
    const upsertHash = (key: string, value: object) => {
      const fa = ret.find(f => f.monitorId === key);
      if (fa) {
        fa.data.push(value);
      } else {
        ret.push({ monitorId: key, data: [value] });
      }
    };
    buckets.forEach((bucket: any, index: number, array: any[]) => {
      const nextPoint = array[index + 1];
      let bucketSize = 0;
      if (nextPoint) {
        bucketSize = Math.abs(nextPoint.key - bucket.key);
      } else {
        bucketSize = defaultBucketSize;
      }
      const { buckets: idBuckets } = bucket.by_id;
      idBuckets.forEach(
        ({ key: monitorId, status }: { key: string; status: { buckets: any[] } }) => {
          let upCount = null;
          let downCount = null;
          status.buckets.forEach(({ key, doc_count }: { key: string; doc_count: number }) => {
            if (key === 'up') {
              upCount = doc_count;
            } else if (key === 'down') {
              downCount = doc_count;
            }
          });
          upsertHash(monitorId, {
            upCount,
            downCount,
            x: bucket.key + bucketSize,
            x0: bucket.key,
            y: 1,
          });
        }
      );
    });

    return ret;
  }

  public async getDocCount(request: any): Promise<DocCount> {
    const { count } = await this.database.count(request, { index: INDEX_NAMES.HEARTBEAT });

    return { count };
  }
}
