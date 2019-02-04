/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import moment from 'moment';
import { INDEX_NAMES } from '../../../../common/constants';
import { DocCount, HistogramSeries, Ping, PingResults } from '../../../../common/graphql/types';
import { getFilteredQueryAndStatusFilter } from '../../helper';
import { DatabaseAdapter } from '../database';
import { UMPingsAdapter } from './adapter_types';

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
    sort?: string | null,
    size?: number | null
  ): Promise<PingResults> {
    const sortParam = sort ? { sort: [{ '@timestamp': { order: sort } }] } : undefined;
    const sizeParam = size ? { size } : undefined;
    const filter: any[] = [{ range: { '@timestamp': { gte: dateRangeStart, lte: dateRangeEnd } } }];
    if (monitorId) {
      filter.push({ term: { 'monitor.id': monitorId } });
    }
    if (status) {
      filter.push({ term: { 'monitor.status': status } });
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
    monitorId?: string | null
  ): Promise<Ping[]> {
    const filter: any[] = [];
    if (monitorId) {
      filter.push({ term: { 'monitor.id': monitorId } });
    }
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

    if (filter.length) {
      params.body.query.bool.filter.push(...filter);
    }

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
  ): Promise<HistogramSeries[] | null> {
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
            auto_date_histogram: {
              field: '@timestamp',
              buckets: 25,
            },
            aggs: {
              by_id: {
                terms: {
                  field: 'monitor.id',
                  size: 200,
                },
                aggs: {
                  status: {
                    terms: {
                      field: 'monitor.status',
                      size: 2,
                    },
                  },
                },
              },
            },
          },
          current_status: {
            terms: {
              field: 'monitor.id',
              size: 200,
            },
            aggs: {
              latest: {
                top_hits: {
                  size: 1,
                  sort: [
                    {
                      '@timestamp': 'desc',
                    },
                  ],
                },
              },
            },
          },
        },
      },
    };

    /**
     * The following code associates a monitor's ID with the data that will
     * be displayed along with its histogram. The histogram components we're using
     * require data to be formatted beyond simply an x/y shape; instead we need
     * a definition of space to occupy on the x axis for each data point, defined as
     * "x" and "x0".
     *
     * Each data point is assigned to a key/value pair, where the key is the monitor's
     * ID, and the value is a list of data points associated with its up or down status.
     */
    const histogramList: HistogramSeries[] = [];
    // This function adds a processed data point to the histogram series for the appropriate monitor ID
    // Because we aren't applying filters to our top_hits result in the above query, we drop anything
    // that doesn't conform to the filter, if it's defined. If an entry already exists in our list, we
    // add the given data point to it, otherwise we create a new entry.
    const updateHistogramSeries = (key: string, value: object) => {
      const status = get(
        currentStatus.find(h => h.key === key),
        'latest.hits.hits[0]._source.monitor.status',
        null
      );
      if (!statusFilter || (statusFilter && status === statusFilter)) {
        const histogramEntry = histogramList.find(
          (entry: HistogramSeries) => entry.monitorId === key
        );
        if (histogramEntry && histogramEntry.data) {
          histogramEntry.data.push(value);
        } else {
          histogramList.push({ monitorId: key, data: [value] });
        }
      }
    };
    const result = await this.database.search(request, params);
    const buckets: any[] = get(result, 'aggregations.timeseries.buckets', []);
    const currentStatus: any[] = get(result, 'aggregations.current_status.buckets', []);
    // null is allowed for this type
    if (buckets.length === 0) {
      return null;
    }
    /**
     * In the below loop, we iterate each monitor.id term, and within iterate
     * over the data result from our auto_histogram agg, and append those data
     * to the series collection we will return to the client.
     */
    const defaultBucketSize = Math.abs(buckets[0].key - buckets[1].key);
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
          updateHistogramSeries(monitorId, {
            upCount,
            downCount,
            x: bucket.key + bucketSize,
            x0: bucket.key,
            y: 1,
          });
        }
      );
    });

    return histogramList;
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
