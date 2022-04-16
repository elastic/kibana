/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ElasticsearchClient } from '@kbn/core/server';
import { wrapRouteWithLicenseCheck } from '@kbn/licensing-plugin/server';

import { checkLicense } from '../../lib/check_license';
import type { LogstashPluginRouter } from '../../types';

async function deletePipelines(client: ElasticsearchClient, pipelineIds: string[]) {
  const deletePromises = pipelineIds.map((pipelineId) => {
    return client.logstash
      .deletePipeline({
        id: pipelineId,
      })
      .then((response) => ({ success: response }))
      .catch((error) => ({ error }));
  });

  const results = await Promise.all(deletePromises);
  const successes = results.filter((result) => Reflect.has(result, 'success'));
  const errors = results.filter((result) => Reflect.has(result, 'error'));

  return {
    numSuccesses: successes.length,
    numErrors: errors.length,
  };
}

export function registerPipelinesDeleteRoute(router: LogstashPluginRouter) {
  router.post(
    {
      path: '/api/logstash/pipelines/delete',
      validate: {
        body: schema.object({
          pipelineIds: schema.arrayOf(schema.string()),
        }),
      },
    },
    wrapRouteWithLicenseCheck(
      checkLicense,
      router.handleLegacyErrors(async (context, request, response) => {
        const client = context.core.elasticsearch.client.asCurrentUser;
        const results = await deletePipelines(client, request.body.pipelineIds);

        return response.ok({ body: { results } });
      })
    )
  );
}
