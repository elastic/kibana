/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import Boom from 'boom';
import { get } from 'lodash';
import { LicenseState, verifyApiAccess } from '../lib/license_state';

export function registerExploreRoute({
  router,
  licenseState,
}: {
  router: IRouter;
  licenseState: LicenseState;
}) {
  router.post(
    {
      path: '/api/graph/graphExplore',
      validate: {
        body: schema.object({
          index: schema.string(),
          query: schema.object({}, { unknowns: 'allow' }),
        }),
      },
    },
    router.handleLegacyErrors(
      async (
        {
          core: {
            elasticsearch: {
              legacy: {
                client: { callAsCurrentUser: callCluster },
              },
            },
          },
        },
        request,
        response
      ) => {
        verifyApiAccess(licenseState);
        try {
          return response.ok({
            body: {
              resp: await callCluster('transport.request', {
                path: '/' + encodeURIComponent(request.body.index) + '/_graph/explore',
                body: request.body.query,
                method: 'POST',
                query: {},
              }),
            },
          });
        } catch (error) {
          // Extract known reasons for bad choice of field
          const relevantCause = get(
            error,
            'body.error.root_cause',
            [] as Array<{ type: string; reason: string }>
          ).find((cause: { type: string; reason: string }) => {
            return (
              cause.reason.includes('Fielddata is disabled on text fields') ||
              cause.reason.includes('No support for examining floating point') ||
              cause.reason.includes('Sample diversifying key must be a single valued-field') ||
              cause.reason.includes('Failed to parse query') ||
              cause.type === 'parsing_exception'
            );
          });

          if (relevantCause) {
            throw Boom.badRequest(relevantCause.reason);
          }

          return response.internalError({
            body: {
              message: error.message,
            },
          });
        }
      }
    )
  );
}
