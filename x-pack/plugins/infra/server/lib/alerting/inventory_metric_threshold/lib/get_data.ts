/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { InfraTimerangeInput, SnapshotCustomMetricInput } from '../../../../../common/http_api';
import {
  InventoryItemType,
  SnapshotMetricType,
} from '../../../../../common/inventory_models/types';
import { LogQueryFields } from '../../../../services/log_queries/get_log_query_fields';
import { InfraSource } from '../../../sources';
import { createRequest } from './create_request';

interface BucketKey {
  node: string;
}
type Response = Record<string, number | null>;
type Metric = Record<string, { value: number | null }>;
interface Bucket {
  key: BucketKey;
  doc_count: number;
}
type NodeBucket = Bucket & Metric;
interface ResponseAggregations {
  nodes: {
    after_key?: BucketKey;
    buckets: NodeBucket[];
  };
}

export const getData = async (
  esClient: ElasticsearchClient,
  nodeType: InventoryItemType,
  metric: SnapshotMetricType,
  timerange: InfraTimerangeInput,
  source: InfraSource,
  logQueryFields: LogQueryFields | undefined,
  compositeSize: number,
  filterQuery?: string,
  customMetric?: SnapshotCustomMetricInput,
  afterKey?: BucketKey,
  previousNodes: Response = {}
): Promise<Response> => {
  const handleResponse = (aggs: ResponseAggregations, previous: Response) => {
    const { nodes } = aggs;
    const nextAfterKey = nodes.after_key;
    for (const bucket of nodes.buckets) {
      const metricId = customMetric && customMetric.field ? customMetric.id : metric;
      previous[bucket.key.node] = bucket?.[metricId]?.value ?? null;
    }
    if (nextAfterKey && nodes.buckets.length === compositeSize) {
      return getData(
        esClient,
        nodeType,
        metric,
        timerange,
        source,
        logQueryFields,
        compositeSize,
        filterQuery,
        customMetric,
        nextAfterKey,
        previous
      );
    }
    return previous;
  };

  const index =
    metric === 'logRate' && logQueryFields
      ? logQueryFields.indexPattern
      : source.configuration.metricAlias;
  const request = createRequest(
    index,
    nodeType,
    metric,
    timerange,
    compositeSize,
    afterKey,
    filterQuery,
    customMetric
  );
  const { body } = await esClient.search<undefined, ResponseAggregations>(request);
  if (body.aggregations) {
    return handleResponse(body.aggregations, previousNodes);
  }
  return previousNodes;
};
