/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'src/core/server';
import {
  InfraMetadataAggregationBucket,
  InfraMetadataAggregationResponse,
} from '../../../lib/adapters/framework';
import { KibanaFramework } from '../../../lib/adapters/framework/kibana_framework_adapter';
import { InfraSourceConfiguration } from '../../../lib/sources';
import { CLOUD_METRICS_MODULES } from '../../../lib/constants';

export interface InfraCloudMetricsAdapterResponse {
  buckets: InfraMetadataAggregationBucket[];
}

export const getCloudMetricsMetadata = async (
  framework: KibanaFramework,
  requestContext: RequestHandlerContext,
  sourceConfiguration: InfraSourceConfiguration,
  instanceId: string,
  timeRange: { from: number; to: number }
): Promise<InfraCloudMetricsAdapterResponse> => {
  const metricQuery = {
    allowNoIndices: true,
    ignoreUnavailable: true,
    index: sourceConfiguration.metricAlias,
    body: {
      query: {
        bool: {
          filter: [
            { match: { 'cloud.instance.id': instanceId } },
            {
              range: {
                [sourceConfiguration.fields.timestamp]: {
                  gte: timeRange.from,
                  lte: timeRange.to,
                  format: 'epoch_millis',
                },
              },
            },
          ],
          should: CLOUD_METRICS_MODULES.map((module) => ({ match: { 'event.module': module } })),
        },
      },
      size: 0,
      aggs: {
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
    }
  >(requestContext, 'search', metricQuery);

  const buckets =
    response.aggregations && response.aggregations.metrics
      ? response.aggregations.metrics.buckets
      : [];

  return { buckets };
};
