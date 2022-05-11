/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

export interface SignalVersionsAggResponse {
  aggregations: {
    signals_indices: {
      buckets: Array<{
        key: string;
        signal_versions: {
          buckets: Array<{
            key: number;
            doc_count: number;
          }>;
        };
      }>;
    };
  };
}

export interface SignalVersion {
  version: number;
  count: number;
}

export interface SignalVersionsByIndex {
  [indexName: string]: SignalVersion[] | undefined;
}

/**
 * Retrieves a breakdown of signals version for each
 * given signals index.
 *
 * @param esClient An {@link ElasticsearchClient}
 * @param index name(s) of the signals index(es)
 *
 * @returns a {@link SignalsVersionsByIndex} object
 *
 * @throws if client returns an error
 */
export const getSignalVersionsByIndex = async ({
  esClient,
  index,
}: {
  esClient: ElasticsearchClient;
  index: string[];
}): Promise<SignalVersionsByIndex> => {
  const response = await esClient.search({
    index,
    size: 0,
    body: {
      aggs: {
        signals_indices: {
          terms: {
            field: '_index',
          },
          aggs: {
            signal_versions: {
              terms: {
                field: 'signal._meta.version',
                missing: 0,
              },
            },
          },
        },
      },
    },
  });

  const aggs = response.aggregations as SignalVersionsAggResponse['aggregations'];
  const indexBuckets = aggs.signals_indices.buckets;

  return index.reduce<SignalVersionsByIndex>((agg, _index) => {
    const bucket = indexBuckets.find((ib) => ib.key === _index);
    const signalVersionBuckets = bucket?.signal_versions?.buckets ?? [];
    const signalsVersions = signalVersionBuckets.map((sb) => ({
      version: sb.key,
      count: sb.doc_count,
    }));

    return {
      ...agg,
      [_index]: signalsVersions,
    };
  }, {});
};
