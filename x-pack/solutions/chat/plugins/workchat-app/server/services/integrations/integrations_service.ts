/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  ElasticsearchServiceStart,
  KibanaRequest,
  SavedObjectsServiceStart,
  SecurityServiceStart,
} from '@kbn/core/server';
import type { McpClientProvider } from '@kbn/wci-server';
import type { Integration } from '../../../common/integrations';
import { integrationTypeName } from '../../saved_objects/integrations';
import type { IntegrationRegistry } from './integration_registry';
import { IntegrationClientImpl, IntegrationClient } from './integration_client';

interface IntegrationsServiceOptions {
  logger: Logger;
  elasticsearch: ElasticsearchServiceStart;
  registry: IntegrationRegistry;
  savedObjects: SavedObjectsServiceStart;
  security: SecurityServiceStart;
}

export interface IntegrationsService {
  /**
   * Returns an integration client scoped to the current user.
   */
  getScopedClient({ request }: { request: KibanaRequest }): Promise<IntegrationClient>;

  /**
   * Create integration providers for given integration ids. Use '*' to resolve all integrations
   */
  getIntegrationProviders({
    integrationIds,
    request,
  }: {
    integrationIds: string[] | '*';
    request: KibanaRequest;
  }): Promise<McpClientProvider[]>;
}

export class IntegrationsServiceImpl implements IntegrationsService {
  private readonly logger: Logger;
  private readonly registry: IntegrationRegistry;
  private readonly savedObjects: SavedObjectsServiceStart;
  private readonly security: SecurityServiceStart;

  constructor({ logger, registry, savedObjects, security }: IntegrationsServiceOptions) {
    this.logger = logger;
    this.registry = registry;
    this.savedObjects = savedObjects;
    this.security = security;
  }

  async getScopedClient({ request }: { request: KibanaRequest }): Promise<IntegrationClient> {
    const user = this.security.authc.getCurrentUser(request);
    if (!user) {
      throw new Error('No user bound to the provided request');
    }
    const soClient = this.savedObjects.getScopedClient(request, {
      includedHiddenTypes: [integrationTypeName],
    });

    return new IntegrationClientImpl({
      logger: this.logger.get('client'),
      client: soClient,
      user: { id: user.profile_uid!, username: user.username },
    });
  }

  async getIntegrationProviders({
    integrationIds,
    request,
  }: {
    integrationIds: string[] | '*';
    request: KibanaRequest;
  }): Promise<McpClientProvider[]> {
    const client = await this.getScopedClient({ request });

    let integrations: Integration[] = [];
    if (typeof integrationIds === 'string') {
      integrations = await client.list();
    } else {
      for (const integrationId of integrationIds) {
        // TODO: bulk get on client
        integrations.push(await client.get({ integrationId }));
      }
    }

    return await Promise.all(
      integrations.map<Promise<McpClientProvider>>(async (source) => {
        return integrationToProvider({
          integration: source,
          request,
          registry: this.registry,
        });
      })
    );
  }
}

const integrationToProvider = async ({
  integration,
  registry,
  request,
}: {
  integration: Integration;
  registry: IntegrationRegistry;
  request: KibanaRequest;
}): Promise<McpClientProvider> => {
  const definition = registry.get(integration.type);
  const instance = await definition.createIntegration({
    request,
    integrationId: integration.id,
    configuration: integration.configuration,
    description: integration.description,
  });
  return {
    id: integration.id,
    connect: instance.connect,
    meta: {},
  };
};
