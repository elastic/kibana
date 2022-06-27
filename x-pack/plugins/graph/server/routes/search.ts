/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { UI_SETTINGS } from '@kbn/data-plugin/server';
import { LicenseState, verifyApiAccess } from '../lib/license_state';

export function registerSearchRoute({
  router,
  licenseState,
}: {
  router: IRouter;
  licenseState: LicenseState;
}) {
  router.post(
    {
      path: '/api/graph/searchProxy',
      validate: {
        body: schema.object({
          index: schema.string(),
          body: schema.object({}, { unknowns: 'allow' }),
        }),
      },
    },
    router.handleLegacyErrors(async ({ core }, request, response) => {
      verifyApiAccess(licenseState);
      licenseState.notifyUsage('Graph');
      const {
        uiSettings: { client: uiSettings },
        elasticsearch: { client: esClient },
      } = await core;
      const includeFrozen = await uiSettings.get<boolean>(UI_SETTINGS.SEARCH_INCLUDE_FROZEN);
      try {
        return response.ok({
          body: {
            resp: await esClient.asCurrentUser.search({
              index: request.body.index,
              body: request.body.body,
              track_total_hits: true,
              ...(includeFrozen ? { ignore_throttled: false } : {}),
            }),
          },
        });
      } catch (error) {
        return response.customError({
          statusCode: error.statusCode || 500,
          body: {
            message: error.message,
          },
        });
      }
    })
  );
}
