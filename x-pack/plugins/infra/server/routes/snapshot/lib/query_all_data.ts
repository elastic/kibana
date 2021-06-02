/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import {
  MetricsAPIRequest,
  MetricsAPIResponse,
  SnapshotNodeResponse,
} from '../../../../common/http_api';
import { ESSearchClient } from '../../../lib/metrics/types';
import { query } from '../../../lib/metrics';
import { InfraDatabaseSearchResponse } from '../../../lib/adapters/framework';

const handleMetricsAPIResponse = (
  client: ESSearchClient,
  options: MetricsAPIRequest,
  previousResponse?: MetricsAPIResponse
) => async (resp: MetricsAPIResponse): Promise<MetricsAPIResponse> => {
  const combinedResponse = previousResponse
    ? {
        ...previousResponse,
        series: [...previousResponse.series, ...resp.series],
        info: resp.info,
      }
    : resp;
  if (resp.info.afterKey) {
    return query(client, { ...options, afterKey: resp.info.afterKey }).then(
      handleMetricsAPIResponse(client, options, combinedResponse)
    );
  }
  return combinedResponse;
};

export const queryAllData = (client: ESSearchClient, options: MetricsAPIRequest) => {
  return query(client, options).then(handleMetricsAPIResponse(client, options));
};

export interface SnapshotAggregationBucketMetrics {
  [id: string]: {
    value: number | null;
  };
}

export type SnapshotAggregationBucket = SnapshotAggregationBucketMetrics & {
  key: {
    [id: string]: number | string | null;
  };
  doc_count: number;
  __metadata__: {
    top: Array<{ metrics: { [id: string]: string } }>;
  };
};

interface SnapshotAggregation {
  nodes: {
    after_key?: {
      [key: string]: number | string | null;
    };
    buckets: SnapshotAggregationBucket[];
  };
}

const handleCompositeResponse = (
  client: ESSearchClient,
  params: estypes.SearchRequest,
  previousResponse?: SnapshotAggregationBucket[]
) => async (
  resp: InfraDatabaseSearchResponse<{}, SnapshotAggregation>
): Promise<SnapshotAggregationBucket[]> => {
  const nodeBuckets = resp.aggregations?.nodes.buckets ?? [];
  const combinedResponse = previousResponse ? [...previousResponse, ...nodeBuckets] : nodeBuckets;

  if (resp.aggregations?.nodes.after_key && params.body && params.body.aggs) {
    const newParams = {
      ...params,
      body: {
        ...params.body,
        aggs: {
          ...params.body.aggs,
          nodes: {
            ...params.body.aggs.nodes,
            composite: {
              ...params.body.aggs.nodes.composite,
              after: resp.aggregations.nodes.after_key,
            },
          },
        },
      },
    };

    return client<{}, SnapshotAggregation>(newParams).then(
      handleCompositeResponse(client, newParams, combinedResponse)
    );
  }

  return combinedResponse;
};

export const queryAllSnapshotData = (client: ESSearchClient, params: estypes.SearchRequest) => {
  return client<{}, SnapshotAggregation>(params).then(handleCompositeResponse(client, params));
};
