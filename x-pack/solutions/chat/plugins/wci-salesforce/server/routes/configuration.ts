/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { apiCapabilities } from '@kbn/workchat-app/common/features';
import type { RouteDependencies } from './types';
import { SalesforceClient } from '../lib/salesforce_client';

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
        const client = new SalesforceClient(
          {
            domain: request.body.domain,
            clientId: request.body.clientId,
            clientSecret: request.body.clientSecret,
          },
          logger
        );

        const isValid = await client.validateCredentials();

        if (!isValid) {
          return res.badRequest({
            body: {
              message: 'Invalid Salesforce credentials',
            },
          });
        }

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

  // Get available Salesforce objects
  router.post(
    {
      path: '/internal/wci-salesforce/configuration/available_sobjects',
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
        const client = new SalesforceClient(
          {
            domain: request.body.domain,
            clientId: request.body.clientId,
            clientSecret: request.body.clientSecret,
          },
          logger
        );

        const { standard, custom } = await client.getAvailableObjects();

        return res.ok({
          body: {
            standard,
            custom,
          },
        });
      } catch (e) {
        logger.error(e);
        return res.badRequest({
          body: {
            message: 'Failed to fetch Salesforce objects',
            attributes: {
              error: e.message,
            },
          },
        });
      }
    }
  );
};
