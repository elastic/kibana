/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { InfraPluginRequestHandlerContext } from '../../../types';
import {
  InfraMetadataAggregationBucket,
  InfraMetadataAggregationResponse,
} from '../../../lib/adapters/framework';
import { KibanaFramework } from '../../../lib/adapters/framework/kibana_framework_adapter';
import { InfraSourceConfiguration } from '../../../lib/sources';
import { findInventoryFields } from '../../../../common/inventory_models';
import { InventoryItemType } from '../../../../common/inventory_models/types';
import { TIMESTAMP_FIELD } from '../../../../common/constants';

export interface InfraMetricsAdapterResponse {
  id: string;
  name?: string;
  buckets: InfraMetadataAggregationBucket[];
}

export const getMetricMetadata = async (
  framework: KibanaFramework,
  requestContext: InfraPluginRequestHandlerContext,
  sourceConfiguration: InfraSourceConfiguration,
  nodeId: string,
  nodeType: InventoryItemType,
  timeRange: { from: number; to: number }
): Promise<InfraMetricsAdapterResponse> => {
  const fields = findInventoryFields(nodeType);
  const metricQuery = {
    allow_no_indices: true,
    ignore_unavailable: true,
    index: sourceConfiguration.metricAlias,
    body: {
      query: {
        bool: {
          must_not: [{ match: { 'event.dataset': 'aws.ec2' } }],
          filter: [
            {
              match: { [fields.id]: nodeId },
            },
            {
              range: {
                [TIMESTAMP_FIELD]: {
                  gte: timeRange.from,
                  lte: timeRange.to,
                  format: 'epoch_millis',
                },
              },
            },
          ],
        },
      },
      size: 0,
      aggs: {
        nodeName: {
          terms: {
            field: fields.name,
            size: 1,
          },
        },
        metrics: {
          terms: {
            field: 'event.dataset',
            size: 1000,
          },
        },
      },
    },
  };

  const response = await framework.callWithRequest<
    {},
    {
      metrics?: InfraMetadataAggregationResponse;
      nodeName?: InfraMetadataAggregationResponse;
    }
  >(requestContext, 'search', metricQuery);

  const buckets =
    response.aggregations && response.aggregations.metrics
      ? response.aggregations.metrics.buckets
      : [];

  return {
    id: nodeId,
    name: get(response, ['aggregations', 'nodeName', 'buckets', 0, 'key'], nodeId),
    buckets,
  };
};
