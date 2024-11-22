/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import type { KibanaRequest } from '@kbn/core/server';
import type { InfraPluginRequestHandlerContext } from '../../types';
import type { InfraBackendLibs } from '../infra_types';

type RequiredParams = Omit<ESSearchRequest, 'index'> & {
  body: {
    size: number;
    track_total_hits: boolean | number;
  };
};

export type InfraMetricsClient = Awaited<ReturnType<typeof getInfraMetricsClient>>;

export async function getInfraMetricsClient({
  libs,
  context,
  request,
}: {
  libs: InfraBackendLibs;
  context: InfraPluginRequestHandlerContext;
  request?: KibanaRequest;
}) {
  const { framework } = libs;
  const infraContext = await context.infra;
  const metricsIndices = await infraContext.getMetricsIndices();

  return {
    search<TDocument, TParams extends RequiredParams>(
      searchParams: TParams
    ): Promise<InferSearchResponseOf<TDocument, TParams>> {
      return framework.callWithRequest(
        context,
        'search',
        {
          ...searchParams,
          ignore_unavailable: true,
          index: metricsIndices,
        },
        request
      ) as Promise<any>;
    },
  };
}
