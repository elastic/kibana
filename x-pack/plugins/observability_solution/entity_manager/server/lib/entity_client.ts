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
import { startTransform } from './entities/start_transform';
import { findEntityDefinitions } from './entities/find_entity_definition';
import { uninstallEntityDefinition } from './entities/uninstall_entity_definition';
import { EntityDefinitionNotFound } from './entities/errors/entity_not_found';

import {
  stopHistoryTransform,
  stopLatestTransform,
  stopHistoryBackfillTransform,
} from './entities/stop_transforms';

import { isBackfillEnabled } from './entities/helpers/is_backfill_enabled';

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
      await startTransform(this.options.esClient, definition, this.options.logger);
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

  async getEntityDefinitions({ page = 1, perPage = 10 }: { page?: number; perPage?: number }) {
    const definitions = await findEntityDefinitions({
      esClient: this.options.esClient,
      soClient: this.options.soClient,
      page,
      perPage,
    });

    return { definitions };
  }

  async startTransforms(definition: EntityDefinition) {
    return startTransform(this.options.esClient, definition, this.options.logger);
  }

  async stopTransforms(definition: EntityDefinition) {
    return Promise.all([
      stopHistoryTransform(this.options.esClient, definition, this.options.logger),
      stopLatestTransform(this.options.esClient, definition, this.options.logger),
      isBackfillEnabled(definition)
        ? stopHistoryBackfillTransform(this.options.esClient, definition, this.options.logger)
        : Promise.resolve(),
    ]);
  }
}
