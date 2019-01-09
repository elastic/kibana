/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { INDEX_NAMES } from '../../../../common/constants';
import { UMGqlRange, UMPingSortDirectionArg } from '../../../../common/domain_types';
import { DocCount, HistogramSeries, Ping, PingResults } from '../../../../common/graphql/types';
import { DatabaseAdapter } from '../database';
import { UMPingsAdapter } from './adapter_types';

const getFilteredQuery = (dateRangeStart: number, dateRangeEnd: number, filters?: string) => {
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
    dateRangeStart: number,
    dateRangeEnd: number,
    monitorId?: string,
    status?: string,
    sort?: UMPingSortDirectionArg,
    size?: number
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
    dateRangeStart: number,
    dateRangeEnd: number,
    monitorId?: string
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
    return buckets.map(({ latest: { hits: { hits } } }) => ({
      ...hits[0]._source,
      timestamp: hits[0]._source[`@timestamp`],
    }));
  }

  public async getPingHistogram(
    request: any,
    range: UMGqlRange,
    filters?: string
  ): Promise<HistogramSeries[] | null> {
    const { dateRangeStart, dateRangeEnd } = range;
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
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        query: {
          match_all: {},
        },
        size: 1,
      },
    };
    const result = await this.database.search(request, params);
    return {
      count: get(result, 'hits.total.value', 0),
    };
  }
}
