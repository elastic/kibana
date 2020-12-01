/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import { LicenseState, verifyApiAccess } from '../lib/license_state';
import { UI_SETTINGS } from '../../../../../src/plugins/data/server';

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
    router.handleLegacyErrors(
      async (
        {
          core: {
            uiSettings: { client: uiSettings },
            elasticsearch: { client: esClient },
          },
        },
        request,
        response
      ) => {
        verifyApiAccess(licenseState);
        licenseState.notifyUsage('Graph');
        const includeFrozen = await uiSettings.get<boolean>(UI_SETTINGS.SEARCH_INCLUDE_FROZEN);
        try {
          return response.ok({
            body: {
              resp: (
                await esClient.asCurrentUser.search({
                  index: request.body.index,
                  body: request.body.body,
                  rest_total_hits_as_int: true,
                  ignore_throttled: !includeFrozen,
                })
              ).body,
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
      }
    )
  );
}
