/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { ExternalRouteDeps } from '.';
import { API_VERSIONS, type Space } from '../../../../common';
import { wrapError } from '../../../lib/errors';
import { createLicensedRouteHandler } from '../../lib';

export function initGetAllSpacesApi(deps: ExternalRouteDeps) {
  const { router, log, getSpacesService } = deps;

  router.versioned
    .get({
      path: '/api/spaces/space',
      access: 'public',
      summary: `Get all spaces`,
      options: {
        tags: ['oas-tag:spaces'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        security: {
          authz: {
            enabled: false,
            reason:
              'This route delegates authorization to the spaces service via a scoped spaces client',
          },
        },
        validate: {
          request: {
            query: schema.object({
              purpose: schema.maybe(
                schema.oneOf(
                  [
                    schema.literal('any'),
                    schema.literal('copySavedObjectsIntoSpace'),
                    schema.literal('shareSavedObjectsIntoSpace'),
                  ],
                  {
                    meta: {
                      description:
                        'Specifies which authorization checks are applied to the API call. The default value is `any`.',
                    },
                  }
                )
              ),
              include_authorized_purposes: schema.conditional(
                schema.siblingRef('purpose'),
                schema.string(),
                schema.maybe(schema.literal(false)),
                schema.maybe(schema.boolean()),
                {
                  meta: {
                    description:
                      'When enabled, the API returns any spaces that the user is authorized to access in any capacity and each space will contain the purposes for which the user is authorized. This can be useful to determine which spaces a user can read but not take a specific action in. If the security plugin is not enabled, this parameter has no effect, since no authorization checks take place. This parameter cannot be used in with the `purpose` parameter.',
                  },
                }
              ),
            }),
          },
          response: {
            200: {
              description: 'Indicates a successful call.',
            },
          },
        },
      },
      createLicensedRouteHandler(async (context, request, response) => {
        log.debug(`Inside GET /api/spaces/space`);

        const { purpose, include_authorized_purposes: includeAuthorizedPurposes } = request.query;

        const spacesClient = getSpacesService().createSpacesClient(request);

        let spaces: Space[];

        try {
          log.debug(
            `Attempting to retrieve all spaces for ${purpose} purpose with includeAuthorizedPurposes=${includeAuthorizedPurposes}`
          );
          spaces = await spacesClient.getAll({ purpose, includeAuthorizedPurposes });
          log.debug(
            `Retrieved ${spaces.length} spaces for ${purpose} purpose with includeAuthorizedPurposes=${includeAuthorizedPurposes}`
          );
        } catch (error) {
          log.debug(
            `Error retrieving spaces for ${purpose} purpose with includeAuthorizedPurposes=${includeAuthorizedPurposes}: ${error}`
          );
          return response.customError(wrapError(error));
        }

        return response.ok({ body: spaces });
      })
    );
}
