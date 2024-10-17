/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition, EntityDefinitionUpdate } from '@kbn/entities-schema';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
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
    const secondaryAuthClient = this.options.clusterClient.asSecondaryAuthUser;
    const definition = await findEntityDefinitionById({
      id,
      soClient: this.options.soClient,
      esClient: secondaryAuthClient,
      includeState: true,
    });

    if (!definition) {
      const message = `Unable to find entity definition with [${id}]`;
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

    const updatedDefinition = await reinstallEntityDefinition({
      definition,
      definitionUpdate,
      soClient: this.options.soClient,
      esClient: secondaryAuthClient,
      logger: this.options.logger,
    });

    if (shouldRestartTransforms) {
      await startTransforms(secondaryAuthClient, updatedDefinition, this.options.logger);
    }
    return updatedDefinition;
  }

  async deleteEntityDefinition({ id, deleteData = false }: { id: string; deleteData?: boolean }) {
    const secondaryAuthClient = this.options.clusterClient.asSecondaryAuthUser;
    const definition = await findEntityDefinitionById({
      id,
      esClient: secondaryAuthClient,
      soClient: this.options.soClient,
    });

    if (!definition) {
      const message = `Unable to find entity definition with [${id}]`;
      this.options.logger.error(message);
      throw new EntityDefinitionNotFound(message);
    }

    await uninstallEntityDefinition({
      definition,
      esClient: secondaryAuthClient,
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
      esClient: this.options.clusterClient.asSecondaryAuthUser,
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
    return startTransforms(
      this.options.clusterClient.asSecondaryAuthUser,
      definition,
      this.options.logger
    );
  }

  async stopEntityDefinition(definition: EntityDefinition) {
    return stopTransforms(
      this.options.clusterClient.asSecondaryAuthUser,
      definition,
      this.options.logger
    );
  }
}
