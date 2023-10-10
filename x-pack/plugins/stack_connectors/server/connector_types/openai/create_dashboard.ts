/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import { DashboardAttributes } from '@kbn/dashboard-plugin/common';
import { Logger } from '@kbn/logging';
import { getDashboard } from './dashboard';

export interface OutputError {
  message: string;
  statusCode: number;
}

export const initDashboard = async ({
  logger,
  savedObjectsClient,
  dashboardId,
}: {
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
  dashboardId: string;
}): Promise<{
  success: boolean;
  error?: OutputError;
}> => {
  try {
    await savedObjectsClient.get<DashboardAttributes>('dashboard', dashboardId);
    return {
      success: true,
    };
  } catch (error) {
    // if 404, does not yet exist. do not error, continue to create
    if (error.output.statusCode !== 404) {
      return {
        success: false,
        error: {
          message: `${error.output.payload.error}${
            error.output.payload.message ? `: ${error.output.payload.message}` : ''
          }`,
          statusCode: error.output.statusCode,
        },
      };
    }
  }

  try {
    await savedObjectsClient.create<DashboardAttributes>(
      'dashboard',
      getDashboard(dashboardId).attributes,
      {
        overwrite: true,
        id: dashboardId,
      }
    );
    logger.info(`Successfully created Gen Ai Dashboard ${dashboardId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: { message: error.message, statusCode: error.output.statusCode },
    };
  }
};
