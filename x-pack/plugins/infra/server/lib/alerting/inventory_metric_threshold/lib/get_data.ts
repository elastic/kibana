/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import type { Logger } from '@kbn/logging';
import { InventoryMetricConditions } from '../../../../../common/alerting/metrics';
import { InfraTimerangeInput, SnapshotCustomMetricInput } from '../../../../../common/http_api';
import {
  InventoryItemType,
  SnapshotMetricType,
} from '../../../../../common/inventory_models/types';
import { LogQueryFields } from '../../../metrics/types';
import { InfraSource } from '../../../sources';
import { createRequest } from './create_request';

interface BucketKey {
  node: string;
}
type Response = Record<string, { value: number | null; warn: boolean; trigger: boolean }>;
type Metric = Record<string, { value: number | null }>;
interface Bucket {
  key: BucketKey;
  doc_count: number;
  shouldWarn: { value: number };
  shouldTrigger: { value: number };
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
  condition: InventoryMetricConditions,
  logger: Logger,
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
      previous[bucket.key.node] = {
        value: bucket?.[metricId]?.value ?? null,
        warn: bucket?.shouldWarn.value > 0 ?? false,
        trigger: bucket?.shouldTrigger.value > 0 ?? false,
      };
    }
    if (nextAfterKey) {
      return getData(
        esClient,
        nodeType,
        metric,
        timerange,
        source,
        logQueryFields,
        compositeSize,
        condition,
        logger,
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
    condition,
    filterQuery,
    customMetric
  );
  logger.trace(`Request: ${JSON.stringify(request)}`);
  const body = await esClient.search<undefined, ResponseAggregations>(request);
  logger.trace(`Response: ${JSON.stringify(body)}`);
  if (body.aggregations) {
    return handleResponse(body.aggregations, previousNodes);
  }
  return previousNodes;
};
