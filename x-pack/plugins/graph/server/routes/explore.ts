/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { IRouter } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import Boom from '@hapi/boom';
import { LicenseState, verifyApiAccess } from '../lib/license_state';

interface ErrorResponse {
  error?: {
    root_cause?: Array<{ type: string; reason: string }>;
  };
}

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
            elasticsearch: { client: esClient },
          },
        },
        request,
        response
      ) => {
        verifyApiAccess(licenseState);
        licenseState.notifyUsage('Graph');
        try {
          return response.ok({
            body: {
              resp: await esClient.asCurrentUser.transport.request({
                path: '/' + encodeURIComponent(request.body.index) + '/_graph/explore',
                body: request.body.query,
                method: 'POST',
              }),
            },
          });
        } catch (error) {
          if (error instanceof errors.ResponseError) {
            const errorBody: ErrorResponse = error.body;
            const relevantCause = (errorBody.error?.root_cause ?? []).find((cause) => {
              return (
                cause.reason.includes('Fielddata is disabled on text fields') ||
                cause.reason.includes('No support for examining floating point') ||
                cause.reason.includes('Sample diversifying key must be a single valued-field') ||
                cause.reason.includes('Failed to parse query') ||
                cause.reason.includes('Text fields are not optimised for operations') ||
                cause.type === 'parsing_exception'
              );
            });

            if (relevantCause) {
              throw Boom.badRequest(relevantCause.reason);
            }
          }

          throw error;
        }
      }
    )
  );
}
