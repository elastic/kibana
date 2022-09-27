/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESSearchRequest } from '@kbn/es-types';
import { InfraPluginStart, InfraPluginSetup } from '@kbn/infra-plugin/server';
import { ApmPluginRequestHandlerContext } from '../../../../routes/typings';
import { getInfraMetricIndices } from '../../get_infra_metric_indices';

interface InfraPlugin {
  setup: InfraPluginSetup;
  start: () => Promise<InfraPluginStart>;
}

interface InfraMetricsResponse {
  aggregations?: any;
  hits?: any;
}

export type InfraClient = Awaited<ReturnType<typeof createInfraMetricsClient>>;

export async function createInfraMetricsClient({
  infraPlugin,
  context,
}: {
  infraPlugin: InfraPlugin;
  context: ApmPluginRequestHandlerContext;
}) {
  return {
    search: async <TParams extends Omit<ESSearchRequest, 'index'>>(
      opts: TParams
    ) => {
      const {
        savedObjects: { client: savedObjectsClient },
        elasticsearch: { client: esClient },
      } = await context.core;

      const indexName = await getInfraMetricIndices({
        infraPlugin,
        savedObjectsClient,
      });

      const searchParams = {
        index: [indexName],
        ...opts,
      };

      return esClient.asCurrentUser.search(
        searchParams
      ) as unknown as Promise<InfraMetricsResponse>;
      // return unwrapEsResponse(res);
    },
  };
}
