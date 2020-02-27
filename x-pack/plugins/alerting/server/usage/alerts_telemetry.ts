/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ISavedObjectsRepository } from 'kibana/server';
import { TaskManagerStartContract } from '../../../task_manager/server';
import { AlertTypeRegistry } from '../alert_type_registry';
import { parseDuration } from '../lib';

export async function getTotalCountAggregations(savedObjectsRepository: ISavedObjectsRepository) {
  const findResult = await savedObjectsRepository.find({
    type: 'alert',
    fields: ['enabled', 'throttle', 'schedule'],
  });

  if (findResult.total === 0) {
    return {
      count_total: 0,
      count_active_total: 0,
      count_disabled_total: 0,
      throttle_time: {
        min: 0,
        avg: 0,
        max: 0,
      },
      schedule_time: {
        min: 0,
        avg: 0,
        max: 0,
      },
      connectors_per_alert: {
        min: 0,
        avg: 0,
        max: 0,
      },
    };
  }

  const alertsWithThrottle = findResult.saved_objects.filter(
    (savedObject: any) => savedObject.attributes.throttle !== null
  );
  const totalThrottleTime = alertsWithThrottle.reduce(
    (sum, savedObject: any) => sum + parseDuration(savedObject.attributes.throttle),
    0
  );
  const minThrottleTime = Math.min(
    ...alertsWithThrottle.map((savedObject: any) => {
      return parseDuration(savedObject.attributes.throttle);
    })
  );
  const maxThrottleTime = Math.max(
    ...alertsWithThrottle.map((savedObject: any) => {
      return parseDuration(savedObject.attributes.throttle);
    })
  );

  const alertsWithInterval = findResult.saved_objects.filter(
    (savedObject: any) =>
      savedObject.attributes.schedule !== null && savedObject.attributes.schedule.interval
  );

  const totalIntervalTime = alertsWithInterval.reduce(
    (sum, savedObject: any) => sum + parseDuration(savedObject.attributes.schedule.interval),
    0
  );

  const minIntervalTime = Math.min(
    ...alertsWithInterval.map((savedObject: any) => {
      return parseDuration(savedObject.attributes.schedule.interval);
    })
  );
  const maxIntervalTime = Math.max(
    ...alertsWithInterval.map((savedObject: any) => {
      return parseDuration(savedObject.attributes.schedule.interval);
    })
  );

  const alertsWithConnectorsCount = findResult.saved_objects.map((savedObject: any) => {
    return {
      ...savedObject,
      references: [
        ...new Set(
          savedObject.references
            .filter((ref: any) => ref.type === 'action')
            .map((ref: any) => ref.id)
        ),
      ],
    };
  });

  const totalConnectorsCount = alertsWithConnectorsCount.reduce(
    (sum, savedObject: any) => sum + savedObject.references.length,
    0
  );

  const minConnectorsCount = Math.min(
    ...alertsWithConnectorsCount.map((savedObject: any) => {
      return savedObject.references.length;
    })
  );
  const maxConnectorsCount = Math.max(
    ...alertsWithConnectorsCount.map((savedObject: any) => {
      return savedObject.references.length;
    })
  );

  return {
    count_total: findResult.total,
    count_active_total: findResult.saved_objects.filter(
      (savedObject: any) => savedObject.attributes.enabled
    ).length,
    count_disabled_total: findResult.saved_objects.filter(
      (savedObject: any) => !savedObject.attributes.enabled
    ).length,
    throttle_time: {
      min: alertsWithThrottle.length > 0 ? `${minThrottleTime / 1000}s` : '0',
      avg:
        alertsWithThrottle.length > 0
          ? `${totalThrottleTime / alertsWithThrottle.length / 1000}s`
          : '0',
      max: alertsWithThrottle.length > 0 ? `${maxThrottleTime / 1000}s` : '0',
    },
    schedule_time: {
      min: `${minIntervalTime / 1000}s`,
      avg: `${(alertsWithInterval.length > 0 ? totalIntervalTime / alertsWithInterval.length : 0) /
        1000}s`,
      max: `${maxIntervalTime / 1000}s`,
    },
    connectors_per_alert: {
      min: minConnectorsCount,
      avg: Math.round(totalConnectorsCount / findResult.total),
      max: maxConnectorsCount,
    },
  };
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

async function getTotalCountByAlertType(
  savedObjectsRepository: ISavedObjectsRepository,
  alertTypeId: string
) {
  const findResult = await savedObjectsRepository.find({
    type: 'alert',
    searchFields: ['alertTypeId'],
    fields: ['alertTypeId'],
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

async function getTotalInUseCountByAlertType(
  savedObjectsRepository: ISavedObjectsRepository,
  alertTypeId: string
) {
  const findResult = await savedObjectsRepository.find({
    type: 'alert',
    searchFields: ['alertTypeId'],
    fields: ['alertTypeId'],
    search: alertTypeId,
  });

  if (findResult.total === 0) {
    return 0;
  }

  return findResult.saved_objects.filter((savedObject: any) => savedObject.attributes.enabled)
    .length;
}

// TODO: Replace executions count telemetry with eventLog, when it will write to index
async function getExecutions(taskManager: TaskManagerStartContract) {
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
