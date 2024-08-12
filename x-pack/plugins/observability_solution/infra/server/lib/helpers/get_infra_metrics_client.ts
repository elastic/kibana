/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import type { KibanaRequest } from '@kbn/core/server';
import { MetricsDataClient } from '@kbn/metrics-data-access-plugin/server';
import type { InfraPluginRequestHandlerContext } from '../../types';
import { KibanaFramework } from '../adapters/framework/kibana_framework_adapter';

type RequiredParams = Omit<ESSearchRequest, 'index'> & {
  body: {
    size: number;
    track_total_hits: boolean | number;
  };
};

export type InfraMetricsClient = Awaited<ReturnType<typeof getInfraMetricsClient>>;

export async function getInfraMetricsClient({
  framework,
  metricsDataAccess,
  requestContext,
  request,
}: {
  framework: KibanaFramework;
  metricsDataAccess: MetricsDataClient;
  requestContext: InfraPluginRequestHandlerContext;
  request?: KibanaRequest;
}) {
  const coreContext = await requestContext.core;
  const savedObjectsClient = coreContext.savedObjects.client;
  const indices = await metricsDataAccess.getMetricIndices({
    savedObjectsClient,
  });

  return {
    search<TDocument, TParams extends RequiredParams>(
      searchParams: TParams
    ): Promise<InferSearchResponseOf<TDocument, TParams>> {
      return framework.callWithRequest(
        requestContext,
        'search',
        {
          ...searchParams,
          index: indices,
        },
        request
      ) as Promise<any>;
    },
  };
}
