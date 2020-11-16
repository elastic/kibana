/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick } from 'lodash';
import type { Request } from '@hapi/hapi';
import { pipe } from 'fp-ts/lib/pipeable';
import { map, fromNullable, getOrElse } from 'fp-ts/lib/Option';
import {
  Logger,
  SavedObjectsClientContract,
  KibanaRequest,
  SavedObjectReference,
  IBasePath,
} from '../../../../../src/core/server';
import { ActionExecutorContract } from './action_executor';
import { ExecutorError } from './executor_error';
import { RunContext } from '../../../task_manager/server';
import { EncryptedSavedObjectsClient } from '../../../encrypted_saved_objects/server';
import { ActionTypeDisabledError } from './errors';
import {
  ActionTaskParams,
  ActionTypeRegistryContract,
  SpaceIdToNamespaceFunction,
  ActionTypeExecutorResult,
} from '../types';
import { ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE } from '../saved_objects';
import { asSavedObjectExecutionSource } from './action_execution_source';

export interface TaskRunnerContext {
  logger: Logger;
  actionTypeRegistry: ActionTypeRegistryContract;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  spaceIdToNamespace: SpaceIdToNamespaceFunction;
  basePathService: IBasePath;
  getUnsecuredSavedObjectsClient: (request: KibanaRequest) => SavedObjectsClientContract;
}

export class TaskRunnerFactory {
  private isInitialized = false;
  private taskRunnerContext?: TaskRunnerContext;
  private readonly actionExecutor: ActionExecutorContract;

  constructor(actionExecutor: ActionExecutorContract) {
    this.actionExecutor = actionExecutor;
  }

  public initialize(taskRunnerContext: TaskRunnerContext) {
    if (this.isInitialized) {
      throw new Error('TaskRunnerFactory already initialized');
    }
    this.isInitialized = true;
    this.taskRunnerContext = taskRunnerContext;
  }

  public create({ taskInstance }: RunContext) {
    if (!this.isInitialized) {
      throw new Error('TaskRunnerFactory not initialized');
    }

    const { actionExecutor } = this;
    const {
      logger,
      encryptedSavedObjectsClient,
      spaceIdToNamespace,
      basePathService,
      getUnsecuredSavedObjectsClient,
    } = this.taskRunnerContext!;

    return {
      async run() {
        const { spaceId, actionTaskParamsId } = taskInstance.params as Record<string, string>;
        const namespace = spaceIdToNamespace(spaceId);

        const {
          attributes: { actionId, params, apiKey },
          references,
        } = await encryptedSavedObjectsClient.getDecryptedAsInternalUser<ActionTaskParams>(
          ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
          actionTaskParamsId,
          { namespace }
        );

        const requestHeaders: Record<string, string> = {};
        if (apiKey) {
          requestHeaders.authorization = `ApiKey ${apiKey}`;
        }

        const path = spaceId ? `/s/${spaceId}` : '/';

        // Since we're using API keys and accessing elasticsearch can only be done
        // via a request, we're faking one with the proper authorization headers.
        const fakeRequest = KibanaRequest.from(({
          headers: requestHeaders,
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
        } as unknown) as Request);

        basePathService.set(fakeRequest, path);

        let executorResult: ActionTypeExecutorResult<unknown>;
        try {
          executorResult = await actionExecutor.execute({
            params,
            actionId,
            request: fakeRequest,
            ...getSourceFromReferences(references),
          });
        } catch (e) {
          if (e instanceof ActionTypeDisabledError) {
            // We'll stop re-trying due to action being forbidden
            throw new ExecutorError(e.message, {}, false);
          }
          throw e;
        }

        if (executorResult.status === 'error') {
          // Task manager error handler only kicks in when an error thrown (at this time)
          // So what we have to do is throw when the return status is `error`.
          throw new ExecutorError(
            executorResult.message,
            executorResult.data,
            executorResult.retry == null ? false : executorResult.retry
          );
        }

        // Cleanup action_task_params object now that we're done with it
        try {
          // If the request has reached this far we can assume the user is allowed to run clean up
          // We would idealy secure every operation but in order to support clean up of legacy alerts
          // we allow this operation in an unsecured manner
          // Once support for legacy alert RBAC is dropped, this can be secured
          await getUnsecuredSavedObjectsClient(fakeRequest).delete(
            ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
            actionTaskParamsId
          );
        } catch (e) {
          // Log error only, we shouldn't fail the task because of an error here (if ever there's retry logic)
          logger.error(
            `Failed to cleanup ${ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE} object [id="${actionTaskParamsId}"]: ${e.message}`
          );
        }
      },
    };
  }
}

function getSourceFromReferences(references: SavedObjectReference[]) {
  return pipe(
    fromNullable(references.find((ref) => ref.name === 'source')),
    map((source) => ({
      source: asSavedObjectExecutionSource(pick(source, 'id', 'type')),
    })),
    getOrElse(() => ({}))
  );
}
