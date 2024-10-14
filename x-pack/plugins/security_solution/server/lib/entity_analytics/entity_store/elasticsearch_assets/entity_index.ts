/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EntityType } from '../../../../../common/api/entity_analytics';
import { getEntitiesIndexName } from '../utils';

interface Options {
  entityType: EntityType;
  esClient: ElasticsearchClient;
  namespace: string;
  logger: Logger;
}

export const createEntityIndex = async ({ entityType, esClient, namespace, logger }: Options) => {
  try {
    await esClient.indices.create({
      index: getEntitiesIndexName(entityType, namespace),
      body: {},
    });
  } catch (e) {
    if (e.meta.body.error.type === 'resource_already_exists_exception') {
      logger.debug(`Index for ${entityType} already exists, skipping creation.`);
    } else {
      throw e;
    }
  }
};

export const deleteEntityIndex = ({ entityType, esClient, namespace }: Options) =>
  esClient.indices.delete(
    {
      index: getEntitiesIndexName(entityType, namespace),
    },
    {
      ignore: [404],
    }
  );
