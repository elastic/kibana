/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IntegrationType } from '@kbn/wci-common';
import type {
  ListIntegrationsResponse,
  GetIntegrationResponse,
  CreateIntegrationResponse,
  UpdateIntegrationResponse,
  DeleteIntegrationResponse,
} from '../../common/http_api/integrations';
import { apiCapabilities } from '../../common/features';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';

export const registerIntegrationsRoutes = ({ getServices, router, logger }: RouteDependencies) => {
  const wrapHandler = getHandlerWrapper({ logger });

  // Get a single integration by ID
  router.get(
    {
      path: '/internal/workchat/tools/{integrationId}',
      security: {
        authz: {
          requiredPrivileges: [apiCapabilities.useWorkchat],
        },
      },
      validate: {
        params: schema.object({
          integrationId: schema.string(),
        }),
      },
    },
    wrapHandler(async (ctx, request, res) => {
      const { integrationsService } = getServices();
      const client = await integrationsService.getScopedClient({ request });

      const { integrationId } = request.params;

      const integration = await client.get({ integrationId });

      return res.ok<GetIntegrationResponse>({
        body: integration,
      });
    })
  );

  // List all integrations
  router.get(
    {
      path: '/internal/workchat/tools',
      security: {
        authz: {
          requiredPrivileges: [apiCapabilities.useWorkchat],
        },
      },
      validate: {},
    },
    wrapHandler(async (ctx, request, res) => {
      const { integrationsService } = getServices();
      const client = await integrationsService.getScopedClient({ request });

      const integrations = await client.list();

      return res.ok<ListIntegrationsResponse>({
        body: {
          integrations,
        },
      });
    })
  );

  // Create a new integration
  router.post(
    {
      path: '/internal/workchat/tools',
      security: {
        authz: {
          requiredPrivileges: [apiCapabilities.manageWorkchat],
        },
      },
      validate: {
        body: schema.object({
          type: schema.oneOf(
            // @ts-expect-error complains that IntegrationType may have less than 1 element...
            Object.values(IntegrationType).map((val) => schema.literal(val))
          ),
          name: schema.string(),
          description: schema.string(),
          configuration: schema.recordOf(schema.string(), schema.any()),
        }),
      },
    },
    wrapHandler(async (ctx, request, res) => {
      const { integrationsService } = getServices();
      const client = await integrationsService.getScopedClient({ request });

      const { type, name, description, configuration } = request.body;
      const integration = await client.create({
        type,
        name,
        description,
        configuration,
      });

      return res.ok<CreateIntegrationResponse>({
        body: integration,
      });
    })
  );

  // Update an existing integration
  router.put(
    {
      path: '/internal/workchat/tools/{integrationId}',
      security: {
        authz: {
          requiredPrivileges: [apiCapabilities.manageWorkchat],
        },
      },
      validate: {
        params: schema.object({
          integrationId: schema.string(),
        }),
        body: schema.object({
          name: schema.maybe(schema.string()),
          description: schema.maybe(schema.string()),
          configuration: schema.recordOf(schema.string(), schema.any()),
        }),
      },
    },
    wrapHandler(async (ctx, request, res) => {
      const { integrationsService } = getServices();
      const client = await integrationsService.getScopedClient({ request });

      const { integrationId } = request.params;
      const { name, description, configuration } = request.body;

      const integration = await client.update(integrationId, {
        name,
        description,
        configuration,
      });

      return res.ok<UpdateIntegrationResponse>({
        body: integration,
      });
    })
  );

  // Delete an integration
  router.delete(
    {
      path: '/internal/workchat/tools/{integrationId}',
      security: {
        authz: {
          requiredPrivileges: [apiCapabilities.manageWorkchat],
        },
      },
      validate: {
        params: schema.object({
          integrationId: schema.string(),
        }),
      },
    },
    wrapHandler(async (ctx, request, res) => {
      const { integrationsService } = getServices();
      const client = await integrationsService.getScopedClient({ request });

      const { integrationId } = request.params;

      await client.delete(integrationId);

      return res.ok<DeleteIntegrationResponse>({
        body: {
          success: true,
        },
      });
    })
  );
};
