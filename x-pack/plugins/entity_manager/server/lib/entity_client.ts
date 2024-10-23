/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition, EntityDefinitionUpdate } from '@kbn/entities-schema';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
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
import { EntityDefinitionWithState } from './entities/types';
import { EntityDefinitionUpdateConflict } from './entities/errors/entity_definition_update_conflict';

export class EntityClient {
  constructor(
    private options: {
      esClient: ElasticsearchClient;
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
<<<<<<< HEAD
=======
    this.options.logger.info(
      `Creating definition [${definition.id}] v${definition.version} (installOnly=${installOnly})`
    );
    const secondaryAuthClient = this.options.clusterClient.asSecondaryAuthUser;
>>>>>>> 0617ad44406 ([eem] rename fields to snake case (#195895))
    const installedDefinition = await installEntityDefinition({
      definition,
      soClient: this.options.soClient,
      esClient: this.options.esClient,
      logger: this.options.logger,
    });

    if (!installOnly) {
      await startTransforms(this.options.esClient, installedDefinition, this.options.logger);
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
<<<<<<< HEAD
      esClient: this.options.esClient,
=======
      esClient: this.options.clusterClient.asInternalUser,
>>>>>>> 0617ad44406 ([eem] rename fields to snake case (#195895))
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
<<<<<<< HEAD
      esClient: this.options.esClient,
=======
      clusterClient: this.options.clusterClient,
>>>>>>> 0617ad44406 ([eem] rename fields to snake case (#195895))
      logger: this.options.logger,
    });

    if (shouldRestartTransforms) {
<<<<<<< HEAD
      await startTransforms(this.options.esClient, updatedDefinition, this.options.logger);
=======
      await startTransforms(
        this.options.clusterClient.asSecondaryAuthUser,
        updatedDefinition,
        this.options.logger
      );
>>>>>>> 0617ad44406 ([eem] rename fields to snake case (#195895))
    }
    return updatedDefinition;
  }

  async deleteEntityDefinition({ id, deleteData = false }: { id: string; deleteData?: boolean }) {
<<<<<<< HEAD
    const [definition] = await findEntityDefinitions({
      id,
      perPage: 1,
=======
    const definition = await findEntityDefinitionById({
      id,
      esClient: this.options.clusterClient.asInternalUser,
>>>>>>> 0617ad44406 ([eem] rename fields to snake case (#195895))
      soClient: this.options.soClient,
      esClient: this.options.esClient,
    });

    if (!definition) {
<<<<<<< HEAD
      throw new EntityDefinitionNotFound(`Unable to find entity definition with [${id}]`);
=======
      const message = `Unable to find entity definition [${id}]`;
      this.options.logger.error(message);
      throw new EntityDefinitionNotFound(message);
>>>>>>> 0617ad44406 ([eem] rename fields to snake case (#195895))
    }

    this.options.logger.info(
      `Uninstalling definition [${definition.id}] v${definition.version} (deleteData=${deleteData})`
    );
    await uninstallEntityDefinition({
      definition,
<<<<<<< HEAD
      deleteData,
=======
      esClient: this.options.clusterClient.asSecondaryAuthUser,
>>>>>>> 0617ad44406 ([eem] rename fields to snake case (#195895))
      soClient: this.options.soClient,
      esClient: this.options.esClient,
      logger: this.options.logger,
    });
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
<<<<<<< HEAD
      esClient: this.options.esClient,
=======
      esClient: this.options.clusterClient.asInternalUser,
>>>>>>> 0617ad44406 ([eem] rename fields to snake case (#195895))
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
<<<<<<< HEAD
    return startTransforms(this.options.esClient, definition, this.options.logger);
  }

  async stopEntityDefinition(definition: EntityDefinition) {
    return stopTransforms(this.options.esClient, definition, this.options.logger);
=======
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
>>>>>>> 0617ad44406 ([eem] rename fields to snake case (#195895))
  }
}
