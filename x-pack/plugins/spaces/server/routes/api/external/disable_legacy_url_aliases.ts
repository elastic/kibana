/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { ExternalRouteDeps } from '.';
import { wrapError } from '../../../lib/errors';
import { createLicensedRouteHandler } from '../../lib';

export function initDisableLegacyUrlAliasesApi(deps: ExternalRouteDeps) {
  const { router, getSpacesService, usageStatsServicePromise, log } = deps;
  const usageStatsClientPromise = usageStatsServicePromise.then(({ getClient }) => getClient());

  router.post(
    {
      path: '/api/spaces/_disable_legacy_url_aliases',
      options: {
        description: `Disable legacy URL aliases`,
      },
      validate: {
        body: schema.object({
          aliases: schema.arrayOf(
            schema.object({
              targetSpace: schema.string(),
              targetType: schema.string(),
              sourceId: schema.string(),
            })
          ),
        }),
      },
    },
    createLicensedRouteHandler(async (_context, request, response) => {
      const spacesClient = getSpacesService().createSpacesClient(request);

      const { aliases } = request.body;

      usageStatsClientPromise
        .then((usageStatsClient) => usageStatsClient.incrementDisableLegacyUrlAliases())
        .catch((err) => {
          log.error(
            `Failed to report usage statistics for the disable legacy URL aliases route: ${err.message}`
          );
        });

      try {
        await spacesClient.disableLegacyUrlAliases(aliases);
        return response.noContent();
      } catch (error) {
        return response.customError(wrapError(error));
      }
    })
  );
}
