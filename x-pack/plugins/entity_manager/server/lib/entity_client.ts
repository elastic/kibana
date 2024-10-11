/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition } from '@kbn/entities-schema';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import { installEntityDefinition } from './entities/install_entity_definition';
import { startTransforms } from './entities/start_transforms';
import { findEntityDefinitions } from './entities/find_entity_definition';
import { uninstallEntityDefinition } from './entities/uninstall_entity_definition';
import { EntityDefinitionNotFound } from './entities/errors/entity_not_found';

import { stopTransforms } from './entities/stop_transforms';

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

  async deleteEntityDefinition({ id, deleteData = false }: { id: string; deleteData?: boolean }) {
    const [definition] = await findEntityDefinitions({
      id,
      perPage: 1,
      soClient: this.options.soClient,
      esClient: this.options.esClient,
    });

    if (!definition) {
      const message = `Unable to find entity definition with [${id}]`;
      this.options.logger.error(message);
      throw new EntityDefinitionNotFound(message);
    }

    await uninstallEntityDefinition({
      definition,
      deleteData,
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
      esClient: this.options.esClient,
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
    return startTransforms(this.options.esClient, definition, this.options.logger);
  }

  async stopEntityDefinition(definition: EntityDefinition) {
    return stopTransforms(this.options.esClient, definition, this.options.logger);
  }
}
