/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import type { Logger } from '@kbn/core/server';

/**
 * Checks to see if a given artifact list id has data
 * @param listClient
 * @param listId
 * @param logger
 */
export const doesArtifactHaveData = async (
  listClient: ExceptionListClient,
  listId: string,
  logger?: Logger
): Promise<boolean> => {
  try {
    const dataFound = await listClient.findExceptionListItem({
      listId,
      perPage: 1,
      page: 1,
      sortField: undefined,
      sortOrder: undefined,
      filter: undefined,
      namespaceType: 'agnostic',
    });

    return dataFound ? dataFound.total > 0 : false;
  } catch (error) {
    if (logger) {
      logger.debug(`Failed to find data against endpoint artifact list [${listId}]: error.message`);
    }
    return false;
  }
};
