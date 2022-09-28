/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { ESSearchRequest } from '@kbn/es-types';
import { InfraPluginStart, InfraPluginSetup } from '@kbn/infra-plugin/server';
import { ApmPluginRequestHandlerContext } from '../../../../routes/typings';
import { getInfraMetricIndices } from '../../get_infra_metric_indices';

interface InfraPlugin {
  setup: InfraPluginSetup;
  start: () => Promise<InfraPluginStart>;
}

type InfraMetricsSearchParams = Omit<ESSearchRequest, 'index'>;

export type InfraMetricsClient = ReturnType<typeof createInfraMetricsClient>;

export function createInfraMetricsClient({
  infraPlugin,
  context,
}: {
  infraPlugin: InfraPlugin;
  context: ApmPluginRequestHandlerContext;
}) {
  return {
    async search<TDocument, TParams extends InfraMetricsSearchParams>(
      opts: TParams
    ): Promise<SearchResponse<TDocument, TParams>> {
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

      const res = await esClient.asCurrentUser.search<TDocument, TParams>(
        searchParams
      );
      return res;
    },
  };
}
