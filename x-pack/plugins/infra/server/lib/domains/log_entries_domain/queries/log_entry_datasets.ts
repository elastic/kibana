/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { estypes } from '@elastic/elasticsearch';

import { commonSearchSuccessResponseFieldsRT } from '../../../../utils/elasticsearch_runtime_types';

export const createLogEntryDatasetsQuery = (
  indexName: string,
  timestampField: string,
  startTime: number,
  endTime: number,
  runtimeMappings: estypes.RuntimeFields,
  size: number,
  afterKey?: CompositeDatasetKey
) => ({
  ...defaultRequestParameters,
  body: {
    query: {
      bool: {
        filter: [
          {
            range: {
              [timestampField]: {
                gte: startTime,
                lte: endTime,
              },
            },
          },
          {
            exists: {
              field: 'event.dataset',
            },
          },
        ],
      },
    },
    runtime_mappings: runtimeMappings,
    aggs: {
      dataset_buckets: {
        composite: {
          after: afterKey,
          size,
          sources: [
            {
              dataset: {
                terms: {
                  field: 'event.dataset',
                  order: 'asc',
                },
              },
            },
          ],
        },
      },
    },
  },
  index: indexName,
  size: 0,
});

const defaultRequestParameters = {
  allowNoIndices: true,
  ignoreUnavailable: true,
  trackScores: false,
  trackTotalHits: false,
};

const compositeDatasetKeyRT = rt.type({
  dataset: rt.string,
});

export type CompositeDatasetKey = rt.TypeOf<typeof compositeDatasetKeyRT>;

const logEntryDatasetBucketRT = rt.type({
  key: compositeDatasetKeyRT,
});

export type LogEntryDatasetBucket = rt.TypeOf<typeof logEntryDatasetBucketRT>;

export const logEntryDatasetsResponseRT = rt.intersection([
  commonSearchSuccessResponseFieldsRT,
  rt.type({
    aggregations: rt.type({
      dataset_buckets: rt.intersection([
        rt.type({
          buckets: rt.array(logEntryDatasetBucketRT),
        }),
        rt.partial({
          after_key: compositeDatasetKeyRT,
        }),
      ]),
    }),
  }),
]);

export type LogEntryDatasetsResponse = rt.TypeOf<typeof logEntryDatasetsResponseRT>;
