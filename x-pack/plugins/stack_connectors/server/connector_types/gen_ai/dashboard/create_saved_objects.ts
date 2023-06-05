/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/core/server';

import { SavedObject } from '@kbn/core-saved-objects-api-server';
import { DashboardAttributes } from '@kbn/dashboard-plugin/common';
import { genAiSavedObjectId, genAiUsageDashboard } from './dashboard';

export interface OutputError {
  message: string;
  statusCode: number;
}

export const getGenAiDashboard = async ({
  logger,
  savedObjectsClient,
}: {
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<{
  success: boolean;
  error?: OutputError;
  body?: SavedObject<DashboardAttributes>;
}> => {
  try {
    const doesExist = await savedObjectsClient.get<DashboardAttributes>(
      'dashboard',
      genAiSavedObjectId
    );

    console.log('GET!!!!! doesExist', doesExist);

    return {
      success: true,
      body: doesExist,
    };
  } catch (error) {
    console.log('GET!!!!! error', error);

    logger.error(`Failed to fetch Gen Ai Dashboard saved object: ${error.message}`);
    return { success: false, error: { message: error.message, statusCode: error.statusCode } };
  }

  try {
    const result = await savedObjectsClient.create<DashboardAttributes>(
      'dashboard',
      genAiUsageDashboard.attributes,
      {
        overwrite: true,
        id: genAiSavedObjectId,
      }
    );
    console.log('CREATE!!!!! doesExist', result);

    return { success: true, body: result };
  } catch (error) {
    console.log('CREATE!!!!! error', error);
    logger.error(`Failed to create Gen Ai Dashboard saved object: ${error.message}`);
    return {
      success: false,
      error: { message: error.message, statusCode: error.statusCode },
    };
  }
};
