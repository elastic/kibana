/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ISavedObjectsRepository } from 'src/core/server';
import { AlertsHealth, HealthStatus, RawAlert, AlertExecutionStatusErrorReasons } from '../types';

export const getHealth = async (
  internalSavedObjectsRepository: ISavedObjectsRepository
): Promise<AlertsHealth> => {
  const healthStatuses = {
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
  };

  const { saved_objects: decryptErrorData } = await internalSavedObjectsRepository.find<RawAlert>({
    filter: `alert.attributes.executionStatus.status:error and alert.attributes.executionStatus.error.reason:${AlertExecutionStatusErrorReasons.Decrypt}`,
    fields: ['executionStatus'],
    type: 'alert',
    sortField: 'executionStatus.lastExecutionDate',
    sortOrder: 'desc',
    page: 1,
    perPage: 1,
  });

  if (decryptErrorData.length > 0) {
    healthStatuses.decryptionHealth = {
      status: HealthStatus.Warning,
      timestamp: decryptErrorData[0].attributes.executionStatus.lastExecutionDate,
    };
  }

  const { saved_objects: executeErrorData } = await internalSavedObjectsRepository.find<RawAlert>({
    filter: `alert.attributes.executionStatus.status:error and alert.attributes.executionStatus.error.reason:${AlertExecutionStatusErrorReasons.Execute}`,
    fields: ['executionStatus'],
    type: 'alert',
    sortField: 'executionStatus.lastExecutionDate',
    sortOrder: 'desc',
    page: 1,
    perPage: 1,
  });

  if (executeErrorData.length > 0) {
    healthStatuses.executionHealth = {
      status: HealthStatus.Warning,
      timestamp: executeErrorData[0].attributes.executionStatus.lastExecutionDate,
    };
  }

  const { saved_objects: readErrorData } = await internalSavedObjectsRepository.find<RawAlert>({
    filter: `alert.attributes.executionStatus.status:error and alert.attributes.executionStatus.error.reason:${AlertExecutionStatusErrorReasons.Read}`,
    fields: ['executionStatus'],
    type: 'alert',
    sortField: 'executionStatus.lastExecutionDate',
    sortOrder: 'desc',
    page: 1,
    perPage: 1,
  });

  if (readErrorData.length > 0) {
    healthStatuses.readHealth = {
      status: HealthStatus.Warning,
      timestamp: readErrorData[0].attributes.executionStatus.lastExecutionDate,
    };
  }

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
