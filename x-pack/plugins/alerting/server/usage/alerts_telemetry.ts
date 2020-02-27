/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ISavedObjectsRepository } from 'kibana/server';
import { TaskManagerStartContract } from '../../../task_manager/server';
import { AlertTypeRegistry } from '../alert_type_registry';

export async function getTotalCount(savedObjectsRepository: ISavedObjectsRepository) {
  const findResult = await savedObjectsRepository.find({
    type: 'alert',
  });

  return findResult.total;
}

export async function getInUseTotalCount(savedObjectsRepository: ISavedObjectsRepository) {
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

export async function getTotalCountByAlertTypes(
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

export async function getTotalCountByAlertType(
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

export async function getTotalInUseCountByAlertTypes(
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

export async function getTotalInUseCountByAlertType(
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

// TODO: Replace executions count telemetry with eventLog, when it will write to index
export async function getExecutions(taskManager: TaskManagerStartContract) {
  const result = await taskManager.fetch({
    query: {
      bool: {
        filter: {
          bool: {
            must: {
              term: {
                'task.scope': 'alerting',
              },
            },
          },
        },
      },
    },
    size: 10000,
  });
  return result.docs;
}

export async function getExecutionsCount(taskManager: TaskManagerStartContract) {
  const alertExecutions = await getExecutions(taskManager);
  return alertExecutions.length;
}

export async function getExecutionsCountByAlertTypes(
  taskManager: TaskManagerStartContract,
  alertTypeRegistry: AlertTypeRegistry
) {
  const alertExecutions = await getExecutions(taskManager);
  const totalByAlertType = alertTypeRegistry.list().reduce(
    (res: any, alertType) => ({
      ...res,
      [alertType.name]:
        alertExecutions.filter(execution => execution.taskType === `alerting:${alertType.id}`)
          .length ?? 0,
    }),
    {}
  );
  return totalByAlertType;
}
