/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CatIndicesParams } from 'elasticsearch';
// @ts-ignore
import { handleError } from '../../../../../lib/errors';
import { RouteDependencies } from '../../../../../types';

export function internalMonitoringCheckRoute(_server: unknown, npRoute: RouteDependencies) {
  npRoute.router.get(
    {
      path: '/api/monitoring/v1/elasticsearch_settings/check/internal_monitoring',
      options: { tags: ['access:monitoring'] },
      validate: false,
    },
    async (context, _request, response) => {
      try {
        const catQuery: Pick<CatIndicesParams, 'format' | 'h'> & {
          expand_wildcards: string;
          index?: string;
        } = {
          format: 'json',
          h: 'index',
          expand_wildcards: 'hidden,all',
          index: '.monitoring-*',
        };

        const { client: esClient } = context.core.elasticsearch.legacy;
        const monitoringIndices = await esClient.callAsInternalUser('transport.request', {
          method: 'GET',
          path: '/_cat/indices',
          query: catQuery,
        });

        const mbIndices = monitoringIndices.filter(({ index }: { index: string }) =>
          index.includes('-mb-')
        );

        return response.ok({
          body: {
            legacy_indices: Boolean(monitoringIndices.length - mbIndices.length),
            mb_indices: Boolean(mbIndices.length),
          },
        });
      } catch (err) {
        throw handleError(err);
      }
    }
  );
}
