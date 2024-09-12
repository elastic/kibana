/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { EntityClient } from '@kbn/entityManager-plugin/server/lib/entity_client';

import type {
  EngineDescriptor,
  EntityType,
} from '../../../../common/api/entity_analytics/entity_store/generated/common.gen';
import type { InitEntityStoreResponse } from '../../../../common/api/entity_analytics/entity_store/generated/init.gen';
import { entityEngineDescriptorTypeName } from './saved_object';
import { EngineDescriptorClient } from './saved_object/engine_descriptor';
import {
  ensureEngineExists,
  getEntityDefinition,
  getIdentityFieldForEntityType,
} from './utils/utils';
import {
  ensureAssetCriticalityEnrichPolicies,
  executeAssetCriticalityEnrichPolicies,
  getAssetCriticalityPipelineSteps,
} from '../asset_criticality/asset_criticality_enrich_policy';

interface EntityStoreClientOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  entityClient: EntityClient;
  namespace: string;
  soClient: SavedObjectsClientContract;
}

export class EntityStoreDataClient {
  private engineClient: EngineDescriptorClient;
  constructor(private readonly options: EntityStoreClientOpts) {
    this.engineClient = new EngineDescriptorClient(options.soClient);
  }

  /**
  * HOST:INIT
    curl -H 'Content-Type: application/json' \
      -X POST \
      -H 'kbn-xsrf: true' \
      -H 'elastic-api-version: 2023-10-31' \
      http:///elastic:changeme@localhost:5601/api/entity_store/engines/host/init
  */
  public async init(
    entityType: EntityType,
    spaceId: string = 'default'
  ): Promise<InitEntityStoreResponse> {
    const definition = getEntityDefinition(entityType);

    this.options.logger.debug(`Initializing entity store for ${entityType}`);

    // TODO - move this to somewhere else
    await ensureAssetCriticalityEnrichPolicies(spaceId, this.options.esClient);
    await executeAssetCriticalityEnrichPolicies(spaceId, this.options.esClient);

    this.options.esClient.ingest.putPipeline({
      id: `${definition.id}@platform`,
      body: {
        description: `Ingest pipeline for entity defiinition ${definition.id}`,
        processors: getAssetCriticalityPipelineSteps(
          spaceId,
          getIdentityFieldForEntityType(entityType)
        ),
      },
    });

    const savedObj = await this.engineClient.init(entityType, definition);
    await this.options.entityClient.createEntityDefinition({
      definition,
    });

    const updatedObj = await this.engineClient.update(savedObj.id, 'started');

    return { ...savedObj.attributes, ...updatedObj.attributes };
  }

  /**
  * HOST:START
    curl -H 'Content-Type: application/json' \
      -X POST \
      -H 'kbn-xsrf: true' \
      -H 'elastic-api-version: 2023-10-31' \
      http:///elastic:changeme@localhost:5601/api/entity_store/engines/host/start
  */
  public async start(entityType: EntityType) {
    const definition = getEntityDefinition(entityType);

    const savedObj = await this.engineClient.get(entityType).then(ensureEngineExists(entityType));

    if (savedObj.attributes.status !== 'stopped') {
      throw new Error(
        `Cannot start Entity engine for ${entityType} when current status is: ${savedObj.attributes.status}`
      );
    }

    this.options.logger.debug(`Starting entity store for ${entityType}`);
    // TODO: Manually start the transforms

    const updatedObj = await this.engineClient.update(savedObj.id, 'started');
    return updatedObj.attributes;
  }

  public async stop(entityType: EntityType) {
    const definition = getEntityDefinition(entityType);

    const savedObj = await this.engineClient.get(entityType).then(ensureEngineExists(entityType));

    if (savedObj.attributes.status !== 'started') {
      throw new Error(
        `Cannot stop Entity engine for ${entityType} when current status is: ${savedObj.attributes.status}`
      );
    }

    this.options.logger.debug(`Stopping entity store for ${entityType}`);
    // TODO: Manually stop the transforms
    const updatedObj = await this.engineClient.update(savedObj.id, 'stopped');
    return updatedObj.attributes;
  }

  public async get(entityType: EntityType) {
    return this.engineClient.get(entityType).then(ensureEngineExists(entityType));
  }

  /**
   * LIST
    curl -H 'Content-Type: application/json' \
      -X GET \
      -H 'kbn-xsrf: true' \
      -H 'elastic-api-version: 2023-10-31' \
      http:///elastic:changeme@localhost:5601/api/entity_store/engines
  */
  public async list() {
    return this.options.soClient
      .find<EngineDescriptor>({
        type: entityEngineDescriptorTypeName,
      })
      .then(({ saved_objects: engines }) => ({
        engines: engines.map((engine) => engine.attributes),
        count: engines.length,
      }));
  }

  public async delete(entityType: EntityType, deleteData: boolean) {
    const savedObj = await this.engineClient.get(entityType).then(ensureEngineExists(entityType));

    this.options.logger.debug(`Deleting entity store for ${entityType}`);

    await this.options.entityClient.deleteEntityDefinition({ id: savedObj.id, deleteData });
    await this.engineClient.delete(savedObj.id); // QUESTION: What happens if this fails but the entity definition is successfully deleted?

    return { deleted: true };
  }
}
