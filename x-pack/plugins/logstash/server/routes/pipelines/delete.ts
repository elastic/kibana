/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { LegacyAPICaller, IRouter } from 'src/core/server';
import { wrapRouteWithLicenseCheck } from '../../../../licensing/server';

import { INDEX_NAMES } from '../../../common/constants';
import { checkLicense } from '../../lib/check_license';

async function deletePipelines(callWithRequest: LegacyAPICaller, pipelineIds: string[]) {
  const deletePromises = pipelineIds.map((pipelineId) => {
    return callWithRequest('delete', {
      index: INDEX_NAMES.PIPELINES,
      id: pipelineId,
      refresh: 'wait_for',
    })
      .then((success) => ({ success }))
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

export function registerPipelinesDeleteRoute(router: IRouter) {
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
        const client = context.logstash!.esClient;
        const results = await deletePipelines(client.callAsCurrentUser, request.body.pipelineIds);

        return response.ok({ body: { results } });
      })
    )
  );
}
