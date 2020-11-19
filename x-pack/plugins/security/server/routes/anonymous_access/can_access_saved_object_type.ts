/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { getDetailedErrorMessage, getErrorStatusCode } from '../../errors';
import type { RouteDefinitionParams } from '..';

/**
 * Defines routes that verify of specified Saved Object type can be accessed anonymously.
 */
export function defineCanAccessSavedObjectTypeRoutes({
  router,
  logger,
  getAnonymousAccessService,
}: RouteDefinitionParams) {
  router.get(
    {
      path: '/internal/security/anonymous_access/_can_access_saved_object_type',
      validate: { query: schema.object({ type: schema.string() }) },
    },
    async (_context, request, response) => {
      const anonymousAccessService = getAnonymousAccessService();
      if (!anonymousAccessService.isAnonymousAccessEnabled) {
        return response.ok({ body: { canAccess: false, accessURLParameters: null } });
      }

      try {
        return response.ok({
          body: {
            canAccess: await anonymousAccessService.isSavedObjectTypeAccessibleAnonymously(
              request,
              request.query.type
            ),
            accessURLParameters: anonymousAccessService.accessURLParameters
              ? Object.fromEntries(anonymousAccessService.accessURLParameters.entries())
              : anonymousAccessService.accessURLParameters,
          },
        });
      } catch (err) {
        const errorMessage = getDetailedErrorMessage(err);
        if (getErrorStatusCode(err) === 401) {
          logger.error(`Anonymous access may not be properly configured yet: ${errorMessage}`);
          return response.ok({ body: { canAccess: false, accessURLParameters: null } });
        }

        logger.error(
          `Unexpected error occurred while checking if Saved Object type can be accessed anonymously: ${errorMessage}`
        );
        return response.internalError();
      }
    }
  );
}
