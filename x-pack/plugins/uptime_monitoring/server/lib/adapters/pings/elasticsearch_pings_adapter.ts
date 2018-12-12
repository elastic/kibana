/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { INDEX_NAMES } from '../../../../common/constants/index_names';
import { UMPingSortDirectionArg } from '../../../../common/domain_types';
import { Ping } from '../../../../common/graphql/types';
import { DatabaseAdapter } from '../database';
import { UMPingsAdapter } from './adapter_types';

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
  ): Promise<Ping[]> {
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
      hits: { hits },
    } = await this.database.search(request, params);

    return hits.map(({ _source }: any) => {
      const timestamp = _source['@timestamp'];
      return { timestamp, ..._source };
    });
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
}
