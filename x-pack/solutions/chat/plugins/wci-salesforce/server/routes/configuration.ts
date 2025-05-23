/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { apiCapabilities } from '@kbn/workchat-app/common/features';
import type { RouteDependencies } from './types';

export const registerConfigurationRoutes = ({ router, core, logger }: RouteDependencies) => {
  // Ping endpoint to validate Salesforce credentials
  router.post(
    {
      path: '/internal/wci-salesforce/configuration/ping',
      security: {
        authz: {
          requiredPrivileges: [apiCapabilities.manageWorkchat],
        },
      },
      validate: {
        body: schema.object({
          domain: schema.string(),
          clientId: schema.string(),
          clientSecret: schema.string(),
        }),
      },
    },
    async (ctx, request, res) => {
      try {
        // TODO: Implement actual Salesforce authentication validation
        // This is where you would make a test API call to Salesforce
        // to validate the credentials

        return res.ok({
          body: {
            success: true,
            message: 'Credentials validated successfully',
          },
        });
      } catch (e) {
        logger.error(e);
        return res.badRequest({
          body: {
            message: 'Failed to validate credentials',
            attributes: {
              error: e.message,
            },
          },
        });
      }
    }
  );
};
