/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from 'kibana/server';

import { appContextService } from '../../../app_context';

export const deleteMlModel = async (esClient: ElasticsearchClient, mlModelIds: string[]) => {
  const logger = appContextService.getLogger();
  if (mlModelIds.length) {
    logger.info(`Deleting currently installed ml model ids ${mlModelIds}`);
  }
  await Promise.all(
    mlModelIds.map(async (modelId) => {
      await esClient.ml.deleteTrainedModel({ model_id: modelId }, { ignore: [404] });
      logger.info(`Deleted: ${modelId}`);
    })
  );
};
