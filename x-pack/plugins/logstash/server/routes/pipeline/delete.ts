/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { wrapRouteWithLicenseCheck } from '@kbn/licensing-plugin/server';
import type { LogstashPluginRouter } from '../../types';
import { checkLicense } from '../../lib/check_license';

export function registerPipelineDeleteRoute(router: LogstashPluginRouter) {
  router.delete(
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

        try {
          await client.asCurrentUser.logstash.deletePipeline({ id });
          return response.noContent();
        } catch (e) {
          if (e.statusCode === 404) {
            return response.notFound();
          }
          throw e;
        }
      })
    )
  );
}
