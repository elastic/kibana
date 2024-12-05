/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { fromKueryExpression } from '@kbn/es-query';
import { MaintenanceWindowClientContext, MaintenanceWindowStatus } from '../../../../../common';
import { transformMaintenanceWindowAttributesToMaintenanceWindow } from '../../transforms';
import { findMaintenanceWindowSo } from '../../../../data/maintenance_window';
import type { FindMaintenanceWindowsResult, FindMaintenanceWindowsParams } from './types';
import { findMaintenanceWindowsParamsSchema } from './schemas';

export async function findMaintenanceWindows(
  context: MaintenanceWindowClientContext,
  params?: FindMaintenanceWindowsParams
): Promise<FindMaintenanceWindowsResult> {
  const { savedObjectsClient, logger } = context;

  try {
    if (params) {
      findMaintenanceWindowsParamsSchema.validate(params);
    }
  } catch (error) {
    throw Boom.badRequest(`Error validating find maintenance windows data - ${error.message}`);
  }
  
  const statusToQueryMapping = {
    [MaintenanceWindowStatus.Running]: '(maintenance-window.attributes.events: "now")',
    [MaintenanceWindowStatus.Upcoming]: '(not (maintenance-window.attributes.events: "now") and maintenance-window.attributes.events >= "now")',
    [MaintenanceWindowStatus.Finished]: '(not (maintenance-window.attributes.events >= "now" or maintenance-window.attributes.expirationDate < "now"))',
    [MaintenanceWindowStatus.Archived]: '(maintenance-window.attributes.expirationDate < "now")'
  }

  let fullQuery = '';
  if (params?.statuses && params?.statuses?.length > 0) {
    fullQuery = params?.statuses?.slice(1).reduce( (acc, currentStatusFilter) => acc + ` or ${statusToQueryMapping[currentStatusFilter]}`, statusToQueryMapping[params.statuses[0]])
  }

  const filter = params?.statuses ? fromKueryExpression(fullQuery): '';
  
  try {
    const result = await findMaintenanceWindowSo({
      savedObjectsClient,
      ...(params
        ? { savedObjectsFindOptions: { page: params.page, perPage: params.perPage, search: params.search, filter } }
        : {}),
    });

    return {
      page: result.page,
      perPage: result.per_page,
      total: result.total,
      data: result.saved_objects.map((so) =>
        transformMaintenanceWindowAttributesToMaintenanceWindow({
          attributes: so.attributes,
          id: so.id,
        })
      ),
    };
  } catch (e) {
    const errorMessage = `Failed to find maintenance window, Error: ${e}`;
    logger.error(errorMessage);
    throw Boom.boomify(e, { message: errorMessage });
  }
}
