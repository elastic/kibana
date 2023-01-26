/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ESSearchRequest } from '@kbn/es-types';
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
import { KUBERNETES_POD_UID, NUMBER_OF_DOCUMENTS, termsAggField } from '../../common/utils';

export const createRequest = (
  index: string,
  nodeType: InventoryItemType,
  metric: SnapshotMetricType,
  timerange: InfraTimerangeInput,
  compositeSize: number,
  afterKey: { node: string } | undefined,
  condition: InventoryMetricConditions,
  filterQuery?: string,
  customMetric?: SnapshotCustomMetricInput,
  fieldsExisted?: Record<string, boolean> | null
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

  const containerContextAgg =
    nodeType === 'pod' && fieldsExisted && fieldsExisted[termsAggField[KUBERNETES_POD_UID]]
      ? {
          containerContext: {
            terms: {
              field: termsAggField[KUBERNETES_POD_UID],
              size: NUMBER_OF_DOCUMENTS,
            },
            aggs: {
              container: {
                top_hits: {
                  size: 1,
                  _source: {
                    includes: ['container.*'],
                  },
                },
              },
            },
          },
        }
      : undefined;

  const includesList = ['host.*', 'labels.*', 'tags', 'cloud.*', 'orchestrator.*'];
  const excludesList = ['host.cpu.*', 'host.disk.*', 'host.network.*'];
  if (!containerContextAgg) includesList.push('container.*');

  const additionalContextAgg = {
    additionalContext: {
      top_hits: {
        size: 1,
        _source: {
          includes: includesList,
          excludes: excludesList,
        },
      },
    },
  };

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
          aggs: {
            ...metricAggregations,
            ...bucketSelector,
            ...additionalContextAgg,
            ...containerContextAgg,
          },
        },
      },
    },
  };

  return request;
};
