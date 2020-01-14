/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { schema } from '@kbn/config-schema';
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
          body: schema.object({}, { allowUnknowns: true }),
        }),
      },
    },
    router.handleLegacyErrors(
      async (
        {
          core: {
            uiSettings: { client: uiSettings },
            elasticsearch: {
              dataClient: { callAsCurrentUser: callCluster },
            },
          },
        },
        request,
        response
      ) => {
        verifyApiAccess(licenseState);
        const includeFrozen = await uiSettings.get<boolean>('search:includeFrozen');
        try {
          return response.ok({
            body: {
              resp: await callCluster('search', {
                index: request.body.index,
                body: request.body.body,
                rest_total_hits_as_int: true,
                ignore_throttled: !includeFrozen,
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
      }
    )
  );
}
