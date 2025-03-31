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
import { integrationTypeName } from '../../saved_objects/integrations';
import { IntegrationsSession } from './integrations_session';
import type { IntegrationRegistry } from './integration_registry';
import { IntegrationWithMeta } from './types';
import { IntegrationClientImpl, IntegrationClient } from './integration_client';

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

    const integrations = await Promise.all(
      availableIntegrations.map<Promise<IntegrationWithMeta>>(async (source) => {
        const definition = this.registry.get(source.type);
        const integration = await definition.createIntegration({
          request,
          configuration: source.configuration,
          description: source.description,
        });
        return Object.assign(integration, { id: source.id });
      })
    );

    return new IntegrationsSession({ integrations, logger: this.logger.get('session') });
  }
}
