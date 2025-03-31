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
import type { McpProvider } from '@kbn/wci-server';
import type { Integration } from '../../../common/integrations';
import { integrationTypeName } from '../../saved_objects/integrations';
import { IntegrationsSessionImpl, type IntegrationsSession } from './integrations_session';
import type { IntegrationRegistry } from './integration_registry';
import { IntegrationClientImpl, IntegrationClient } from './integration_client';
import { getBaseToolProvider } from '../orchestration/base_tools';

interface IntegrationsServiceOptions {
  logger: Logger;
  elasticsearch: ElasticsearchServiceStart;
  registry: IntegrationRegistry;
  savedObjects: SavedObjectsServiceStart;
  security: SecurityServiceStart;
}

export interface IntegrationsService {
  getScopedClient({ request }: { request: KibanaRequest }): Promise<IntegrationClient>;
  createSession({ request }: { request: KibanaRequest }): Promise<IntegrationsSession>;
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

  /**
   * Returns an integration client scoped to the current user.
   */
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

  async createSession({ request }: { request: KibanaRequest }): Promise<IntegrationsSession> {
    this.logger.debug('Creating integrations session');

    const client = await this.getScopedClient({ request });

    // Fetch integrations from the saved objects
    const availableIntegrations = await client.list();

    const providers = await Promise.all(
      availableIntegrations.map<Promise<McpProvider>>(async (source) => {
        return integrationToProvider({
          integration: source,
          request,
          registry: this.registry,
        });
      })
    );

    // the create session logic will likely move to the orchestration side
    // very soon, but for now doing this is fine.
    providers.push(await getBaseToolProvider());

    return new IntegrationsSessionImpl({ providers, logger: this.logger.get('session') });
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
}): Promise<McpProvider> => {
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
