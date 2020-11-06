/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ISavedObjectsRepository, SavedObjectsFindResult } from 'src/core/server';
import { AlertsHealth, HealthStatus, RawAlert, AlertExecutionStatusErrorReasons } from '../types';

export const getHealth = async (
  internalSavedObjectsRepository: ISavedObjectsRepository
): Promise<AlertsHealth> => {
  const { saved_objects: data } = await internalSavedObjectsRepository.find<RawAlert>({
    filter: 'alert.attributes.executionStatus.status:error',
    fields: ['executionStatus'],
    type: 'alert',
  });

  const healthStatuses = data.reduce(
    (prevItem: AlertsHealth, item: SavedObjectsFindResult<RawAlert>) => {
      switch (item.attributes.executionStatus.error?.reason) {
        case AlertExecutionStatusErrorReasons.Decrypt:
          prevItem.decryptionHealth = {
            status: HealthStatus.Warning,
            timestamp: item.attributes.executionStatus.lastExecutionDate,
          };
          break;
        case AlertExecutionStatusErrorReasons.Execute:
          prevItem.executionHealth = {
            status: HealthStatus.Warning,
            timestamp: item.attributes.executionStatus.lastExecutionDate,
          };
          break;
        case AlertExecutionStatusErrorReasons.Read:
          prevItem.readHealth = {
            status: HealthStatus.Warning,
            timestamp: item.attributes.executionStatus.lastExecutionDate,
          };
          break;
      }
      return prevItem;
    },
    {
      decryptionHealth: {
        status: HealthStatus.OK,
        timestamp: '',
      },
      executionHealth: {
        status: HealthStatus.OK,
        timestamp: '',
      },
      readHealth: {
        status: HealthStatus.OK,
        timestamp: '',
      },
    }
  );

  const { saved_objects: noErrorData } = await internalSavedObjectsRepository.find<RawAlert>({
    filter: 'not alert.attributes.executionStatus.status:error',
    fields: ['executionStatus'],
    type: 'alert',
    sortField: 'executionStatus.lastExecutionDate',
    sortOrder: 'desc',
  });
  const lastExecutionDate =
    noErrorData.length > 0
      ? noErrorData[0].attributes.executionStatus.lastExecutionDate
      : new Date().toISOString();

  for (const [, statusItem] of Object.entries(healthStatuses)) {
    if (statusItem.status === HealthStatus.OK) {
      statusItem.timestamp = lastExecutionDate;
    }
  }

  return healthStatuses;
};
