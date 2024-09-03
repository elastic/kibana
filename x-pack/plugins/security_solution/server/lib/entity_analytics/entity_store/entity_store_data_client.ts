/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { EntityClient } from '@kbn/entityManager-plugin/server/lib/entity_client';
import type { EntityType } from '../../../../common/api/entity_analytics/entity_store/generated/common.gen';
import type { InitEntityStoreResponse } from '../../../../common/api/entity_analytics/entity_store/generated/init.gen';
import { HOST_ENTITY_DEFINITION, USER_ENTITY_DEFINITION } from './definition';

interface EntityStoreClientOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  entityClient: EntityClient;
  namespace: string;
}

export class EntityStoreDataClient {
  constructor(private readonly options: EntityStoreClientOpts) {}

  /**
    * INIT
        curl -H 'Content-Type: application/json' \
            -X POST \
            -H 'kbn-xsrf: true' \
            -H 'elastic-api-version: 1' \
            http:///elastic:changeme@localhost:5601/api/entity_store/engines/host/init
    */
  public async init(entityType: EntityType): Promise<InitEntityStoreResponse> {
    this.options.logger.debug(`Initializing entity store for ${entityType}`);

    const { indexPatterns, filter, installStatus } =
      await this.options.entityClient.createEntityDefinition({
        definition: this.getEntityDefinition(entityType),
      });

    return {
      type: entityType,
      indexPattern: indexPatterns.join(','),
      filter,
      status: 'started',
    };
  }

  private getEntityDefinition(entityType: EntityType) {
    if (entityType === 'host') return HOST_ENTITY_DEFINITION;
    if (entityType === 'user') return USER_ENTITY_DEFINITION;

    throw new Error(`Unsupported entity type: ${entityType}`);
  }
}
