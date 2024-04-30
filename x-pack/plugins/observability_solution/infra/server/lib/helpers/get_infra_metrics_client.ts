/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import type { KibanaRequest } from '@kbn/core/server';
import type { InfraPluginRequestHandlerContext } from '../../types';
import { InfraSources } from '../sources';
import { KibanaFramework } from '../adapters/framework/kibana_framework_adapter';

type RequiredParams = Omit<ESSearchRequest, 'index'> & {
  body: {
    size: number;
    track_total_hits: boolean | number;
  };
};

export type InfraMetricsClient = Awaited<ReturnType<typeof getInfraMetricsClient>>;

export async function getInfraMetricsClient({
  sourceId,
  framework,
  infraSources,
  requestContext,
  request,
}: {
  sourceId: string;
  framework: KibanaFramework;
  infraSources: InfraSources;
  requestContext: InfraPluginRequestHandlerContext;
  request?: KibanaRequest;
}) {
  const soClient = (await requestContext.core).savedObjects.getClient();
  const source = await infraSources.getSourceConfiguration(soClient, sourceId);

  return {
    search<TDocument, TParams extends RequiredParams>(
      searchParams: TParams
    ): Promise<InferSearchResponseOf<TDocument, TParams>> {
      return framework.callWithRequest(
        requestContext,
        'search',
        {
          ...searchParams,
          index: source.configuration.metricAlias,
        },
        request
      ) as Promise<any>;
    },
  };
}
