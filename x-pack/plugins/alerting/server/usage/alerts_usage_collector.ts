/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { ISavedObjectsRepository } from 'kibana/server';
import { AlertsUsage, AlertsTelemetrySavedObject } from './types';
import { AlertTypeRegistry } from '../alert_type_registry';
import { ALERTS_TELEMETRY_DOC_ID, createAlertsTelemetry } from './alerts_telemetry';

async function getTotalCount(savedObjectsRepository: ISavedObjectsRepository) {
  const findResult = await savedObjectsRepository.find({
    type: 'alert',
  });

  return findResult.total;
}

async function getInUseTotalCount(savedObjectsRepository: ISavedObjectsRepository) {
  const findResult = await savedObjectsRepository.find({
    type: 'alert',
    fields: ['enabled'],
  });

  if (findResult.total === 0) {
    return 0;
  }

  return findResult.saved_objects.filter((savedObject: any) => savedObject.attributes.enabled)
    .length;
}

async function getTotalCountByAlertTypes(
  savedObjectsRepository: ISavedObjectsRepository,
  alertTypeRegistry: AlertTypeRegistry
) {
  const totalByAlertType = alertTypeRegistry.list().reduce(async (accPromise: any, alertType) => {
    const acc = await accPromise;
    const total = await getTotalCountByAlertType(savedObjectsRepository, alertType.id);
    return { ...acc, [alertType.name]: total };
  }, Promise.resolve({}));

  return totalByAlertType;
}

async function getTotalCountByAlertType(
  savedObjectsRepository: ISavedObjectsRepository,
  alertTypeId: string
) {
  const findResult = await savedObjectsRepository.find({
    type: 'alert',
    searchFields: ['alertTypeId'],
    search: alertTypeId,
  });

  return findResult.total;
}

async function getTotalInUseCountByAlertTypes(
  savedObjectsRepository: ISavedObjectsRepository,
  alertTypeRegistry: AlertTypeRegistry
) {
  const totalByAlertType = alertTypeRegistry.list().reduce(async (accPromise: any, alertType) => {
    const acc = await accPromise;
    const total = await getTotalInUseCountByAlertType(savedObjectsRepository, alertType.id);
    return { ...acc, [alertType.name]: total };
  }, Promise.resolve({}));

  return totalByAlertType;
}

async function getTotalInUseCountByAlertType(
  savedObjectsRepository: ISavedObjectsRepository,
  alertTypeId: string
) {
  const findResult = await savedObjectsRepository.find({
    type: 'alert',
    searchFields: ['alertTypeId'],
    search: alertTypeId,
  });

  if (findResult.total === 0) {
    return 0;
  }

  return findResult.saved_objects.filter((savedObject: any) => savedObject.attributes.enabled)
    .length;
}

async function getExecutions(savedObjectsRepository: ISavedObjectsRepository) {
  try {
    const alertsTelemetrySavedObject = (await savedObjectsRepository.get(
      'alerts-telemetry',
      ALERTS_TELEMETRY_DOC_ID
    )) as AlertsTelemetrySavedObject;
    return alertsTelemetrySavedObject.attributes;
  } catch (err) {
    return createAlertsTelemetry();
  }
}

async function getExecutionsCount(savedObjectsRepository: ISavedObjectsRepository) {
  const alertExecutions = await getExecutions(savedObjectsRepository);
  return Object.entries(alertExecutions.excutions_count_by_type).reduce(
    (sum, [key, value]) => sum + value,
    0
  );
}

async function getExecutionsCountByAlertTypes(
  savedObjectsRepository: ISavedObjectsRepository,
  alertTypeRegistry: AlertTypeRegistry
) {
  const alertExecutions = await getExecutions(savedObjectsRepository);
  const totalByAlertType = alertTypeRegistry.list().reduce(
    (res: any, alertType) => ({
      ...res,
      [alertType.name]: alertExecutions.excutions_count_by_type[alertType.name] ?? 0,
    }),
    {}
  );
  return totalByAlertType;
}

export function createAlertsUsageCollector(
  usageCollection: UsageCollectionSetup,
  savedObjectsRepository: ISavedObjectsRepository,
  alertTypeRegistry: AlertTypeRegistry
) {
  return usageCollection.makeUsageCollector({
    type: 'alerts',
    isReady: () => true,
    fetch: async (): Promise<AlertsUsage> => {
      return {
        count_total: await getTotalCount(savedObjectsRepository),
        count_active_total: await getInUseTotalCount(savedObjectsRepository),
        executions_total: await getExecutionsCount(savedObjectsRepository),
        count_active_by_type: await getTotalInUseCountByAlertTypes(
          savedObjectsRepository,
          alertTypeRegistry
        ),
        count_by_type: await getTotalCountByAlertTypes(savedObjectsRepository, alertTypeRegistry),
        executions_by_type: await getExecutionsCountByAlertTypes(
          savedObjectsRepository,
          alertTypeRegistry
        ),
      };
    },
  });
}

export function registerAlertsUsageCollector(
  usageCollection: UsageCollectionSetup,
  savedObjects: ISavedObjectsRepository,
  alertTypeRegistry: AlertTypeRegistry
) {
  const collector = createAlertsUsageCollector(usageCollection, savedObjects, alertTypeRegistry);
  usageCollection.registerCollector(collector);
}
