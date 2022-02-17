/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'src/core/server';
import { SecuritySolutionRequestHandlerContext } from '../../types';

export const doLogsEndpointActionDsExists = async ({
  context,
  logger,
  dataStreamName,
}: {
  context: SecuritySolutionRequestHandlerContext;
  logger: Logger;
  dataStreamName: string;
}): Promise<boolean> => {
  try {
    const esClient = context.core.elasticsearch.client.asInternalUser;
    const doesIndexTemplateExist = await esClient.indices.existsIndexTemplate(
      {
        name: dataStreamName,
      },
      { meta: true }
    );
    return doesIndexTemplateExist.statusCode === 404 ? false : true;
  } catch (error) {
    const errorType = error?.type ?? '';
    if (errorType !== 'resource_not_found_exception') {
      logger.error(error);
      throw error;
    }
    return false;
  }
};

export const doesLogsEndpointActionsIndexExist = async ({
  context,
  logger,
  indexName,
}: {
  context: SecuritySolutionRequestHandlerContext;
  logger: Logger;
  indexName: string;
}): Promise<boolean> => {
  try {
    const esClient = context.core.elasticsearch.client.asInternalUser;
    const doesIndexExist = await esClient.indices.exists(
      {
        index: indexName,
      },
      { meta: true }
    );
    return doesIndexExist.statusCode === 404 ? false : true;
  } catch (error) {
    const errorType = error?.type ?? '';
    if (errorType !== 'index_not_found_exception') {
      logger.error(error);
      throw error;
    }
    return false;
  }
};
