/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ESSearchRequest } from '@kbn/core/types/elasticsearch';
import { findInventoryFields } from '../../../../../common/inventory_models';
import { InfraTimerangeInput, SnapshotCustomMetricInput } from '../../../../../common/http_api';
import {
  InventoryItemType,
  SnapshotMetricType,
} from '../../../../../common/inventory_models/types';
import { parseFilterQuery } from '../../../../utils/serialized_query';
import { createMetricAggregations } from './create_metric_aggregations';
import { InventoryMetricConditions } from '../../../../../common/alerting/metrics';
import { createBucketSelector } from './create_bucket_selector';

export const createRequest = (
  index: string,
  nodeType: InventoryItemType,
  metric: SnapshotMetricType,
  timerange: InfraTimerangeInput,
  compositeSize: number,
  afterKey: { node: string } | undefined,
  condition: InventoryMetricConditions,
  filterQuery?: string,
  customMetric?: SnapshotCustomMetricInput
) => {
  const filters: any[] = [
    {
      range: {
        '@timestamp': {
          gte: timerange.from,
          lte: timerange.to,
          format: 'epoch_millis',
        },
      },
    },
  ];
  const parsedFilters = parseFilterQuery(filterQuery);
  if (parsedFilters) {
    filters.push(parsedFilters);
  }

  const inventoryFields = findInventoryFields(nodeType);

  const composite: any = {
    size: compositeSize,
    sources: [{ node: { terms: { field: inventoryFields.id } } }],
  };
  if (afterKey) {
    composite.after = afterKey;
  }
  const metricAggregations = createMetricAggregations(timerange, nodeType, metric, customMetric);
  const bucketSelector = createBucketSelector(metric, condition, customMetric);

  const request: ESSearchRequest = {
    allow_no_indices: true,
    ignore_unavailable: true,
    index,
    body: {
      size: 0,
      query: { bool: { filter: filters } },
      aggs: {
        nodes: {
          composite,
          aggs: { ...metricAggregations, ...bucketSelector },
        },
      },
    },
  };

  return request;
};
