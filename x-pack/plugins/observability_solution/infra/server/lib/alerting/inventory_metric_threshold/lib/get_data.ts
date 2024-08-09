/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregate, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common';
import type { InventoryItemType, SnapshotMetricType } from '@kbn/metrics-data-access-plugin/common';
import type { InventoryMetricConditions } from '../../../../../common/alerting/metrics';
import type {
  InfraTimerangeInput,
  SnapshotCustomMetricInput,
} from '../../../../../common/http_api';
import type { LogQueryFields } from '../../../metrics/types';
import type { InfraSource } from '../../../sources';
import { createRequest } from './create_request';
import {
  AdditionalContext,
  doFieldsExist,
  KUBERNETES_POD_UID,
  termsAggField,
} from '../../common/utils';

interface BucketKey {
  node: string;
}

type Response = Record<
  string,
  {
    value: number | null;
    warn: boolean;
    trigger: boolean;
  } & AdditionalContext
>;

type Metric = Record<string, { value: number | null }>;

interface Bucket {
  key: BucketKey;
  doc_count: number;
  shouldWarn: { value: number };
  shouldTrigger: { value: number };
  containerContext?: ContainerContext;
  additionalContext: SearchResponse<EcsFieldsResponse, Record<string, AggregationsAggregate>>;
}

interface ContainerContext {
  buckets: ContainerBucket[];
}

interface ContainerBucket {
  key: BucketKey;
  doc_count: number;
  container: SearchResponse<EcsFieldsResponse, Record<string, AggregationsAggregate>>;
}

type NodeBucket = Bucket & Metric;
interface ResponseAggregations {
  nodes: {
    after_key?: BucketKey;
    buckets: NodeBucket[];
  };
}

const createContainerList = (containerContext: ContainerContext) => {
  const containerList = [];
  for (const containerBucket of containerContext.buckets) {
    const containerHits = containerBucket.container.hits?.hits;
    const containerSource =
      containerHits && containerHits.length > 0 ? containerHits[0]._source : null;
    if (containerSource && containerSource.container) {
      containerList.push(containerSource.container);
    }
  }
  return containerList;
};

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

      const containerList = bucket.containerContext
        ? createContainerList(bucket.containerContext)
        : undefined;

      const bucketHits = bucket.additionalContext?.hits?.hits;
      const additionalContextSource =
        bucketHits && bucketHits.length > 0 ? bucketHits[0]._source : null;

      previous[bucket.key.node] = {
        value: bucket?.[metricId]?.value ?? null,
        warn: bucket?.shouldWarn.value > 0 ?? false,
        trigger: bucket?.shouldTrigger.value > 0 ?? false,
        container: containerList,
        ...additionalContextSource,
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

  const fieldsExisted =
    nodeType === 'pod'
      ? await doFieldsExist(esClient, [termsAggField[KUBERNETES_POD_UID]], index)
      : null;

  const request = createRequest(
    index,
    nodeType,
    metric,
    timerange,
    compositeSize,
    afterKey,
    condition,
    filterQuery,
    customMetric,
    fieldsExisted
  );
  logger.trace(`Request: ${JSON.stringify(request)}`);
  const body = await esClient.search<undefined, ResponseAggregations>(request);
  logger.trace(`Response: ${JSON.stringify(body)}`);
  if (body.aggregations) {
    return handleResponse(body.aggregations, previousNodes);
  }
  return previousNodes;
};
