/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import { DashboardAttributes } from '@kbn/dashboard-plugin/common';
import { Logger } from '@kbn/logging';
import { getDashboardTitle, getGenAiDashboard } from './dashboard';

export interface OutputError {
  message: string;
  statusCode: number;
}

export const initGenAiDashboard = async ({
  logger,
  savedObjectsClient,
  spaceId,
}: {
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
  spaceId: string;
}): Promise<{
  success: boolean;
  error?: OutputError;
}> => {
  const title = getDashboardTitle(spaceId);
  try {
    const doesExist = await savedObjectsClient.find<DashboardAttributes>({
      search: `"${title}"`,
      searchFields: ['title'],
      type: 'dashboard',
    });
    if (doesExist.total > 0) {
      return {
        success: true,
      };
    }
  } catch (error) {
    logger.error(`Failed to fetch Gen Ai Dashboard saved object: ${error.message}`);

    // if 404, does not yet exist. do not error, continue to create
    if (error.output.statusCode !== 404) {
      return { success: false, error: { message: error.message, statusCode: error.statusCode } };
    }
  }

  try {
    await savedObjectsClient.create<DashboardAttributes>(
      'dashboard',
      getGenAiDashboard(spaceId).attributes
    );

    return { success: true };
  } catch (error) {
    logger.error(`Failed to create Gen Ai Dashboard saved object: ${error.message}`);
    return {
      success: false,
      error: { message: error.message, statusCode: error.statusCode },
    };
  }
};
