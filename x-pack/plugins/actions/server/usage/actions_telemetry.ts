/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ISavedObjectsRepository } from 'kibana/server';
import { TaskManagerStartContract } from '../../../task_manager/server';
import { ActionTypeRegistry } from '../action_type_registry';

export async function getTotalCount(savedObjectsClient: ISavedObjectsRepository) {
  const findResult = await savedObjectsClient.find({
    type: 'action',
  });

  return findResult.total;
}

export async function getInUseTotalCount(savedObjectsClient: ISavedObjectsRepository) {
  const findResult = await savedObjectsClient.find({
    type: 'alert',
    fields: ['actions'],
  });

  if (findResult.total === 0) {
    return 0;
  }

  return new Set(
    findResult.saved_objects.reduce(
      (actionIds: string[], savedObj: any) =>
        actionIds.concat(
          savedObj.references
            .filter((ref: any) => ref.type === 'action')
            .map((action: any) => action.id)
        ),
      []
    )
  ).size;
}

export async function getTotalCountByActionTypes(
  savedObjectsClient: ISavedObjectsRepository,
  actionTypeRegistry: ActionTypeRegistry
) {
  const totalByActionType = actionTypeRegistry
    .list()
    .reduce(async (accPromise: any, actionType) => {
      const acc = await accPromise;
      const total = await getTotalCountByActionType(savedObjectsClient, actionType.id);
      return { ...acc, [actionType.name]: total };
    }, Promise.resolve({}));

  return totalByActionType;
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
                'task.scope': 'actions',
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
  const actionExecutions = await getExecutions(taskManager);
  return actionExecutions.length;
}

export async function getTotalCountByActionType(
  savedObjectsClient: ISavedObjectsRepository,
  actionTypeId: string
) {
  const findResult = await savedObjectsClient.find({
    type: 'action',
    searchFields: ['actionTypeId'],
    search: actionTypeId,
  });

  return findResult.total;
}

export async function getTotalInUseCountByActionTypes(
  savedObjectsClient: ISavedObjectsRepository,
  actionTypeRegistry: ActionTypeRegistry
) {
  const totalByActionType = actionTypeRegistry
    .list()
    .reduce(async (accPromise: any, actionType) => {
      const acc = await accPromise;
      const total = await getTotalInUseCountByActionType(savedObjectsClient, actionType.id);
      return { ...acc, [actionType.name]: total };
    }, Promise.resolve({}));

  return totalByActionType;
}

export async function getTotalInUseCountByActionType(
  savedObjectsClient: ISavedObjectsRepository,
  actionTypeId: string
) {
  const findResult = await savedObjectsClient.find({
    type: 'alert',
    fields: ['actions'],
  });

  if (findResult.total === 0) {
    return 0;
  }

  return new Set(
    findResult.saved_objects.reduce((actionIds: string[], savedObj: any) => {
      const refs = savedObj.attributes.actions
        .filter((ref: any) => ref.actionTypeId === actionTypeId)
        .map((action: any) => action.actionRef);
      const ids = savedObj.references
        .filter((reference: any) => refs.includes(reference.name))
        .map((action: any) => action.id);
      return actionIds.concat(ids);
    }, [])
  ).size;
}

export async function getExecutionsCountByActionTypes(
  taskManager: TaskManagerStartContract,
  actionTypeRegistry: ActionTypeRegistry
) {
  const actionExecutions = await getExecutions(taskManager);
  const totalByActionType = actionTypeRegistry.list().reduce(
    (res: any, actionType) => ({
      ...res,
      [actionType.name]:
        actionExecutions.filter(execution => execution.taskType === `actions:${actionType.id}`)
          .length ?? 0,
    }),
    {}
  );
  return totalByActionType;
  return {};
}
