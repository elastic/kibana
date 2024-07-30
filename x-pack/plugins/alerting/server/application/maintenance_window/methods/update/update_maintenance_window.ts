/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import Boom from '@hapi/boom';
import { buildEsQuery, Filter } from '@kbn/es-query';
import type { MaintenanceWindowClientContext } from '../../../../../common';
import { getScopedQueryErrorMessage } from '../../../../../common';
import type { MaintenanceWindow } from '../../types';
import {
  generateMaintenanceWindowEvents,
  shouldRegenerateEvents,
  mergeEvents,
} from '../../lib/generate_maintenance_window_events';
import { retryIfConflicts } from '../../../../lib/retry_if_conflicts';
import {
  transformMaintenanceWindowAttributesToMaintenanceWindow,
  transformMaintenanceWindowToMaintenanceWindowAttributes,
} from '../../transforms';
import {
  getMaintenanceWindowSo,
  createMaintenanceWindowSo,
} from '../../../../data/maintenance_window';
import { UpdateMaintenanceWindowParams } from './types';
import { updateMaintenanceWindowParamsSchema } from './schemas';

export async function updateMaintenanceWindow(
  context: MaintenanceWindowClientContext,
  params: UpdateMaintenanceWindowParams
): Promise<MaintenanceWindow> {
  return await retryIfConflicts(
    context.logger,
    `maintenanceWindowClient.update('${params.id})`,
    async () => {
      return await updateWithOCC(context, params);
    }
  );
}

async function updateWithOCC(
  context: MaintenanceWindowClientContext,
  params: UpdateMaintenanceWindowParams
): Promise<MaintenanceWindow> {
  const { savedObjectsClient, getModificationMetadata, logger } = context;
  const { id, data } = params;
  const { title, enabled, duration, rRule, categoryIds, scopedQuery } = data;

  try {
    updateMaintenanceWindowParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Error validating update maintenance window data - ${error.message}`);
  }

  let scopedQueryWithGeneratedValue = scopedQuery;
  try {
    if (scopedQuery) {
      const dsl = JSON.stringify(
        buildEsQuery(
          undefined,
          [{ query: scopedQuery.kql, language: 'kuery' }],
          scopedQuery.filters as Filter[]
        )
      );
      scopedQueryWithGeneratedValue = {
        ...scopedQuery,
        dsl,
      };
    }
  } catch (error) {
    throw Boom.badRequest(
      `Error validating update maintenance window data - ${getScopedQueryErrorMessage(
        error.message
      )}`
    );
  }

  try {
    const {
      attributes,
      id: fetchedId,
      version,
    } = await getMaintenanceWindowSo({ id, savedObjectsClient });

    const maintenanceWindow = transformMaintenanceWindowAttributesToMaintenanceWindow({
      attributes,
      id: fetchedId,
    });

    if (moment.utc(maintenanceWindow.expirationDate).isBefore(new Date())) {
      throw Boom.badRequest('Cannot edit archived maintenance windows');
    }

    const expirationDate = moment.utc().add(1, 'year').toISOString();
    const modificationMetadata = await getModificationMetadata();

    let events = generateMaintenanceWindowEvents({
      // @ts-expect-error upgrade typescript v5.1.6
      rRule: rRule || maintenanceWindow.rRule,
      duration: typeof duration === 'number' ? duration : maintenanceWindow.duration,
      expirationDate,
    });

    if (!shouldRegenerateEvents({ maintenanceWindow, rRule, duration })) {
      events = mergeEvents({ oldEvents: maintenanceWindow.events, newEvents: events });
    }

    const updateMaintenanceWindowAttributes =
      transformMaintenanceWindowToMaintenanceWindowAttributes({
        ...maintenanceWindow,
        ...(title ? { title } : {}),
        ...(rRule ? { rRule: rRule as MaintenanceWindow['rRule'] } : {}),
        ...(categoryIds !== undefined ? { categoryIds } : {}),
        ...(scopedQueryWithGeneratedValue !== undefined
          ? { scopedQuery: scopedQueryWithGeneratedValue }
          : {}),
        ...(typeof duration === 'number' ? { duration } : {}),
        ...(typeof enabled === 'boolean' ? { enabled } : {}),
        expirationDate,
        events,
        updatedBy: modificationMetadata.updatedBy,
        updatedAt: modificationMetadata.updatedAt,
      });

    if (updateMaintenanceWindowAttributes.scopedQuery) {
      if (updateMaintenanceWindowAttributes.categoryIds?.length !== 1) {
        throw Boom.badRequest(
          `Error validating update maintenance window data - scoped query must be accompanied by 1 category ID`
        );
      }
    }

    // We are deleting and then creating rather than updating because SO.update
    // performs a partial update on the rRule, we would need to null out all of the fields
    // that are removed from a new rRule if that were the case.
    const result = await createMaintenanceWindowSo({
      savedObjectsClient,
      maintenanceWindowAttributes: updateMaintenanceWindowAttributes,
      savedObjectsCreateOptions: {
        id: fetchedId,
        version,
        overwrite: true,
      },
    });

    return transformMaintenanceWindowAttributesToMaintenanceWindow({
      attributes: result.attributes,
      id: result.id,
    });
  } catch (e) {
    const errorMessage = `Failed to update maintenance window by id: ${id}, Error: ${e}`;
    logger.error(errorMessage);
    throw Boom.boomify(e, { message: errorMessage });
  }
}
