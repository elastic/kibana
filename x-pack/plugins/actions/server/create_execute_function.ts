/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from '../../../../src/core/server';
import { TaskManagerStartContract } from '../../task_manager/server';
import { GetBasePathFunction } from './types';

interface CreateExecuteFunctionOptions {
  taskManager: TaskManagerStartContract;
  getScopedSavedObjectsClient: (request: any) => SavedObjectsClientContract;
  getBasePath: GetBasePathFunction;
  isESOUsingEphemeralEncryptionKey: boolean;
}

export interface ExecuteOptions {
  id: string;
  params: Record<string, any>;
  spaceId: string;
  apiKey: string | null;
}

export function createExecuteFunction({
  getBasePath,
  taskManager,
  getScopedSavedObjectsClient,
  isESOUsingEphemeralEncryptionKey,
}: CreateExecuteFunctionOptions) {
  return async function execute({ id, params, spaceId, apiKey }: ExecuteOptions) {
    if (isESOUsingEphemeralEncryptionKey === true) {
      throw new Error(
        `Unable to execute action due to the Encrypted Saved Objects plugin using an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml`
      );
    }

    const requestHeaders: Record<string, string> = {};

    if (apiKey) {
      requestHeaders.authorization = `ApiKey ${apiKey}`;
    }

    // Since we're using API keys and accessing elasticsearch can only be done
    // via a request, we're faking one with the proper authorization headers.
    const fakeRequest: any = {
      headers: requestHeaders,
      getBasePath: () => getBasePath(spaceId),
      path: '/',
      route: { settings: {} },
      url: {
        href: '/',
      },
      raw: {
        req: {
          url: '/',
        },
      },
    };

    const savedObjectsClient = getScopedSavedObjectsClient(fakeRequest);
    const actionSavedObject = await savedObjectsClient.get('action', id);
    const actionTaskParamsRecord = await savedObjectsClient.create('action_task_params', {
      actionId: id,
      params,
      apiKey,
    });

    await taskManager.schedule({
      taskType: `actions:${actionSavedObject.attributes.actionTypeId}`,
      params: {
        spaceId,
        actionTaskParamsId: actionTaskParamsRecord.id,
      },
      state: {},
      scope: ['actions'],
    });
  };
}
