/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { INDEX_NAMES } from '../../../../common/constants';
import { UMGqlRange, UMPingSortDirectionArg } from '../../../../common/domain_types';
import { HistogramDataPoint, Ping, SnapshotHistogram } from '../../../../common/graphql/types';
import { DatabaseAdapter } from '../database';
import { UMPingsAdapter } from './adapter_types';

export class ElasticsearchPingsAdapter implements UMPingsAdapter {
  private database: DatabaseAdapter;

  constructor(database: DatabaseAdapter) {
    this.database = database;
  }

  public async getAll(request: any, sort?: UMPingSortDirectionArg, size?: number): Promise<Ping[]> {
    const sortParam = sort ? { sort: [{ '@timestamp': { order: sort } }] } : undefined;
    const sizeParam = size ? { size } : undefined;
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        query: {
          match_all: {},
        },
        ...sortParam,
        ...sizeParam,
      },
    };
    const {
      hits: { hits },
    } = await this.database.search(request, params);

    return hits.map(({ _source }: any) => {
      const timestamp = _source['@timestamp'];
      return { timestamp, ..._source };
    });
  }

  public async getPingHistogram(request: any, range: UMGqlRange): Promise<SnapshotHistogram> {
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
          status: {
            terms: {
              field: 'monitor.status',
            },
          },
          latest: {
            max: {
              field: '@timestamp',
            },
          },
          hist: {
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
    };

    const res = await this.database.search(request, params);

    const aggregations: any[] = get(res, 'aggregations.hist.buckets', []);
    const upSeries: HistogramDataPoint[] = [];
    const downSeries: HistogramDataPoint[] = [];
    const defaultBucketSize = Math.abs(aggregations[0].key - aggregations[1].key);
    aggregations.forEach((bucket, index: number, array: any[]) => {
      const nextPoint = array[index + 1];
      let bucketSize = 0;
      if (nextPoint) {
        bucketSize = Math.abs(nextPoint.key - bucket.key);
      } else {
        bucketSize = defaultBucketSize;
      }
      const statusCounts: any[] = get(bucket, 'status.buckets', []);
      if (statusCounts) {
        const upCount = statusCounts.find(count => count.key === 'up');
        const downCount = statusCounts.find(count => count.key === 'down');
        upSeries.push({
          x: bucket.key + bucketSize,
          x0: bucket.key,
          y: get(upCount, 'doc_count', 0),
        });
        downSeries.push({
          x: bucket.key + bucketSize,
          x0: bucket.key,
          y: get(downCount, 'doc_count', 0),
        });
      }
    });

    return {
      upSeries,
      downSeries,
    };
  }
}
