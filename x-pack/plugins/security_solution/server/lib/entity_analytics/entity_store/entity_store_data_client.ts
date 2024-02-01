/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { mappingFromFieldMap } from '@kbn/alerting-plugin/common';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { getEntityStoreIndex } from '../../../../common/entity_analytics/entity_store';
import { createOrUpdateIndex } from '../utils/create_or_update_index';
import { entityStoreFieldMap } from './constants';
import { startEntityStoreTask } from './tasks';

interface EntityStoreClientOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  namespace: string;
}

export class EntityStoreDataClient {
  constructor(private readonly options: EntityStoreClientOpts) {}
  /**
   * It creates the entity store index or update mappings if index exists
   */
  public async init({ taskManager }: { taskManager: TaskManagerStartContract }) {
    await createOrUpdateIndex({
      esClient: this.options.esClient,
      logger: this.options.logger,
      options: {
        index: getEntityStoreIndex(this.options.namespace),
        mappings: mappingFromFieldMap(entityStoreFieldMap, 'strict'),
      },
    });

    await startEntityStoreTask({
      logger: this.options.logger,
      namespace: this.options.namespace,
      taskManager,
    });
  }
}
