/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { ISavedObjectsRepository } from 'kibana/server';
import { ActionsUsage, ActionsTelemetrySavedObject } from './types';
import { ActionTypeRegistry } from '../action_type_registry';
import { createActionsTelemetry } from './actions_telemetry';

export const ACTIONS_TELEMETRY_DOC_ID = 'actions-telemetry';

async function getTotalCount(savedObjectsClient: ISavedObjectsRepository) {
  const findResult = await savedObjectsClient.find({
    type: 'action',
  });

  return findResult.total;
}

async function getInUseTotalCount(savedObjectsClient: ISavedObjectsRepository) {
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

async function getTotalCountByActionTypes(
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

async function getExecutions(savedObjectsClient: ISavedObjectsRepository) {
  try {
    const actionsTasksSavedObject = await savedObjectsClient.find({
      type: 'task',
      fields: ['taskType', 'state'],
      search: 'actions:*',
      searchFields: ['taskType'],
    });
    return actionsTasksSavedObject.saved_objects;
  } catch (err) {
    return createActionsTelemetry();
  }
}

async function getExecutionsCount(savedObjectsClient: ISavedObjectsRepository) {
  const actionExecutions = await getExecutions(savedObjectsClient);
  return Object.entries(actionExecutions).reduce((sum, [, value]) => sum + value, 0);
}

async function getTotalCountByActionType(
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

async function getTotalInUseCountByActionTypes(
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

async function getTotalInUseCountByActionType(
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

async function getExecutionsCountByActionTypes(
  savedObjectsClient: ISavedObjectsRepository,
  actionTypeRegistry: ActionTypeRegistry
) {
  const actionExecutions = await getExecutions(savedObjectsClient);
  /* const totalByActionType = actionTypeRegistry.list().reduce(
    (res: any, actionType) => ({
      ...res,
      [actionType.name]: actionExecutions.excutions_count_by_type[actionType.name] ?? 0,
    }),
    {}
  );
  return totalByActionType; */
  return {};
}

export function createActionsUsageCollector(
  usageCollection: UsageCollectionSetup,
  savedObjectsClient: ISavedObjectsRepository,
  actionTypeRegistry: ActionTypeRegistry
) {
  return usageCollection.makeUsageCollector({
    type: 'actions',
    isReady: () => true,
    fetch: async (): Promise<ActionsUsage> => {
      return {
        count_total: await getTotalCount(savedObjectsClient),
        count_active_total: await getInUseTotalCount(savedObjectsClient),
        executions_total: await getExecutionsCount(savedObjectsClient),
        count_active_by_type: await getTotalInUseCountByActionTypes(
          savedObjectsClient,
          actionTypeRegistry
        ),
        count_by_type: await getTotalCountByActionTypes(savedObjectsClient, actionTypeRegistry),
        executions_by_type: await getExecutionsCountByActionTypes(
          savedObjectsClient,
          actionTypeRegistry
        ),
      };
    },
  });
}

export function registerActionsUsageCollector(
  usageCollection: UsageCollectionSetup,
  savedObjects: ISavedObjectsRepository,
  actionTypeRegistry: ActionTypeRegistry
) {
  const collector = createActionsUsageCollector(usageCollection, savedObjects, actionTypeRegistry);
  usageCollection.registerCollector(collector);
}
