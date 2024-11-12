/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Entity, EntityDefinition, EntityDefinitionUpdate } from '@kbn/entities-schema';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { esqlResultToPlainObjects } from '@kbn/observability-utils/es/utils/esql_result_to_plain_objects';
import { createObservabilityEsClient } from '@kbn/observability-utils/es/client/create_observability_es_client';
import { Logger } from '@kbn/logging';
import {
  installEntityDefinition,
  installationInProgress,
  reinstallEntityDefinition,
} from './entities/install_entity_definition';
import { startTransforms } from './entities/start_transforms';
import { findEntityDefinitionById, findEntityDefinitions } from './entities/find_entity_definition';
import { uninstallEntityDefinition } from './entities/uninstall_entity_definition';
import { EntityDefinitionNotFound } from './entities/errors/entity_not_found';

import { stopTransforms } from './entities/stop_transforms';
import { deleteIndices } from './entities/delete_index';
import { EntityDefinitionWithState } from './entities/types';
import { EntityDefinitionUpdateConflict } from './entities/errors/entity_definition_update_conflict';
import { EntitySource, getEntityInstancesQuery } from './queries';
import { mergeEntitiesList } from './queries/utils';

export class EntityClient {
  constructor(
    private options: {
      clusterClient: IScopedClusterClient;
      soClient: SavedObjectsClientContract;
      logger: Logger;
    }
  ) {}

  async createEntityDefinition({
    definition,
    installOnly = false,
  }: {
    definition: EntityDefinition;
    installOnly?: boolean;
  }) {
    this.options.logger.info(
      `Creating definition [${definition.id}] v${definition.version} (installOnly=${installOnly})`
    );
    const secondaryAuthClient = this.options.clusterClient.asSecondaryAuthUser;
    const installedDefinition = await installEntityDefinition({
      definition,
      esClient: secondaryAuthClient,
      soClient: this.options.soClient,
      logger: this.options.logger,
    });

    if (!installOnly) {
      await startTransforms(secondaryAuthClient, installedDefinition, this.options.logger);
    }

    return installedDefinition;
  }

  async updateEntityDefinition({
    id,
    definitionUpdate,
  }: {
    id: string;
    definitionUpdate: EntityDefinitionUpdate;
  }) {
    const definition = await findEntityDefinitionById({
      id,
      soClient: this.options.soClient,
      esClient: this.options.clusterClient.asInternalUser,
      includeState: true,
    });

    if (!definition) {
      const message = `Unable to find entity definition [${id}]`;
      this.options.logger.error(message);
      throw new EntityDefinitionNotFound(message);
    }

    if (installationInProgress(definition)) {
      const message = `Entity definition [${definition.id}] has changes in progress`;
      this.options.logger.error(message);
      throw new EntityDefinitionUpdateConflict(message);
    }

    const shouldRestartTransforms = (
      definition as EntityDefinitionWithState
    ).state.components.transforms.some((transform) => transform.running);

    this.options.logger.info(
      `Updating definition [${definition.id}] from v${definition.version} to v${definitionUpdate.version}`
    );
    const updatedDefinition = await reinstallEntityDefinition({
      definition,
      definitionUpdate,
      soClient: this.options.soClient,
      clusterClient: this.options.clusterClient,
      logger: this.options.logger,
    });

    if (shouldRestartTransforms) {
      await startTransforms(
        this.options.clusterClient.asSecondaryAuthUser,
        updatedDefinition,
        this.options.logger
      );
    }
    return updatedDefinition;
  }

  async deleteEntityDefinition({ id, deleteData = false }: { id: string; deleteData?: boolean }) {
    const definition = await findEntityDefinitionById({
      id,
      esClient: this.options.clusterClient.asInternalUser,
      soClient: this.options.soClient,
    });

    if (!definition) {
      throw new EntityDefinitionNotFound(`Unable to find entity definition [${id}]`);
    }

    this.options.logger.info(
      `Uninstalling definition [${definition.id}] v${definition.version} (deleteData=${deleteData})`
    );
    await uninstallEntityDefinition({
      definition,
      esClient: this.options.clusterClient.asSecondaryAuthUser,
      soClient: this.options.soClient,
      logger: this.options.logger,
    });

    if (deleteData) {
      // delete data with current user as system user does not have
      // .entities privileges
      await deleteIndices(
        this.options.clusterClient.asCurrentUser,
        definition,
        this.options.logger
      );
    }
  }

  async getEntityDefinitions({
    id,
    page = 1,
    perPage = 10,
    includeState = false,
    type,
    builtIn,
  }: {
    id?: string;
    page?: number;
    perPage?: number;
    includeState?: boolean;
    type?: string;
    builtIn?: boolean;
  }) {
    const definitions = await findEntityDefinitions({
      esClient: this.options.clusterClient.asInternalUser,
      soClient: this.options.soClient,
      page,
      perPage,
      id,
      includeState,
      type,
      builtIn,
    });

    return { definitions };
  }

  async startEntityDefinition(definition: EntityDefinition) {
    this.options.logger.info(`Starting transforms for definition [${definition.id}]`);
    return startTransforms(
      this.options.clusterClient.asSecondaryAuthUser,
      definition,
      this.options.logger
    );
  }

  async stopEntityDefinition(definition: EntityDefinition) {
    this.options.logger.info(`Stopping transforms for definition [${definition.id}]`);
    return stopTransforms(
      this.options.clusterClient.asSecondaryAuthUser,
      definition,
      this.options.logger
    );
  }

  async searchEntities({ sources, limit = 10 }: { sources: EntitySource[]; limit?: number }) {
    const entities = await Promise.all(
      sources.map(async (source) => {
        const esClient = createObservabilityEsClient({
          client: this.options.clusterClient.asCurrentUser,
          logger: this.options.logger,
          plugin: `@kbn/entityManager-plugin`,
        });

        const requiredFields = [...source.identity_fields, ...source.metadata_fields];
        const { fields } = await esClient.client.fieldCaps({
          index: source.index_patterns,
          fields: requiredFields,
        });

        const sourceHasIdentityFields = source.identity_fields.every((field) => !!fields[field]);
        if (!sourceHasIdentityFields) {
          // we can't build entities without id fields so we ignore the source.
          // filters should likely behave similarly.
          return [];
        }

        // but metadata field not being available is fine
        const availableMetadataFields = source.metadata_fields.filter((field) => fields[field]);

        const query = getEntityInstancesQuery(
          { ...source, metadata_fields: availableMetadataFields },
          limit
        );
        this.options.logger.info(`Entity query: ${query}`);

        return await esClient.esql('search_entities', { query }).then((result) =>
          esqlResultToPlainObjects(result).map((entity) => {
            entity['entity.id'] = source.identity_fields.map((field) => entity[field]).join(':');
            entity['entity.type'] = source.type;
            return entity as Entity;
          })
        );
      })
    ).then((results) => results.flat());

    return mergeEntitiesList(entities);
  }
}
