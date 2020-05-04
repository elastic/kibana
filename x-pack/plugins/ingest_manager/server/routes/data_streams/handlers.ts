/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RequestHandler } from 'src/core/server';
import { DataStream } from '../../types';
import { GetDataStreamsResponse } from '../../../common';

const DATA_STREAM_INDEX_PATTERN = 'logs-*-*,metrics-*-*';

export const getListHandler: RequestHandler = async (context, request, response) => {
  const callCluster = context.core.elasticsearch.dataClient.callAsCurrentUser;

  try {
    // Get stats (size on disk) of all potentially matching indices
    const { indices: indexStats } = await callCluster('indices.stats', {
      index: DATA_STREAM_INDEX_PATTERN,
      metric: ['store'],
    });

    // Get all matching indices and info about each
    // This returns the top 100,000 indices (as buckets) by last activity
    const {
      aggregations: {
        index: { buckets: indexResults },
      },
    } = await callCluster('search', {
      index: DATA_STREAM_INDEX_PATTERN,
      body: {
        size: 0,
        query: {
          bool: {
            must: [
              {
                exists: {
                  field: 'stream.namespace',
                },
              },
              {
                exists: {
                  field: 'stream.dataset',
                },
              },
            ],
          },
        },
        aggs: {
          index: {
            terms: {
              field: '_index',
              size: 100000,
              order: {
                last_activity: 'desc',
              },
            },
            aggs: {
              dataset: {
                terms: {
                  field: 'stream.dataset',
                  size: 1,
                },
              },
              namespace: {
                terms: {
                  field: 'stream.namespace',
                  size: 1,
                },
              },
              type: {
                terms: {
                  field: 'stream.type',
                  size: 1,
                },
              },
              package: {
                terms: {
                  field: 'event.module',
                  size: 1,
                },
              },
              last_activity: {
                max: {
                  field: '@timestamp',
                },
              },
            },
          },
        },
      },
    });

    const dataStreams: DataStream[] = (indexResults as any[]).map(result => {
      const {
        key: indexName,
        dataset: { buckets: datasetBuckets },
        namespace: { buckets: namespaceBuckets },
        type: { buckets: typeBuckets },
        package: { buckets: packageBuckets },
        last_activity: { value_as_string: lastActivity },
      } = result;
      return {
        index: indexName,
        dataset: datasetBuckets.length ? datasetBuckets[0].key : '',
        namespace: namespaceBuckets.length ? namespaceBuckets[0].key : '',
        type: typeBuckets.length ? typeBuckets[0].key : '',
        package: packageBuckets.length ? packageBuckets[0].key : '',
        last_activity: lastActivity,
        size_in_bytes: indexStats[indexName] ? indexStats[indexName].total.store.size_in_bytes : 0,
      };
    });

    const body: GetDataStreamsResponse = {
      data_streams: dataStreams,
    };
    return response.ok({
      body,
    });
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};
