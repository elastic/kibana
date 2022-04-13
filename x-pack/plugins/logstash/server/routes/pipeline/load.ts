/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { LogstashPluginRouter } from '../../types';

import { Pipeline } from '../../models/pipeline';
import { wrapRouteWithLicenseCheck } from '../../../../licensing/server';
import { checkLicense } from '../../lib/check_license';

export function registerPipelineLoadRoute(router: LogstashPluginRouter) {
  router.get(
    {
      path: '/api/logstash/pipeline/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    wrapRouteWithLicenseCheck(
      checkLicense,
      router.handleLegacyErrors(async (context, request, response) => {
        const { id } = request.params;
        const { client } = (await context.core).elasticsearch;

        const result = await client.asCurrentUser.logstash.getPipeline({ id }, { ignore: [404] });

        if (result[request.params.id] === undefined) {
          return response.notFound();
        }

        return response.ok({
          body: Pipeline.fromUpstreamJSON(result).downstreamJSON,
        });
      })
    )
  );
}
