/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import type { Request } from '@hapi/hapi';
import { pipe } from 'fp-ts/lib/pipeable';
import { map, fromNullable, getOrElse } from 'fp-ts/lib/Option';
import { addSpaceIdToPath } from '../../../spaces/server';
import {
  Logger,
  SavedObjectsClientContract,
  KibanaRequest,
  SavedObjectReference,
  IBasePath,
  SavedObject,
} from '../../../../../src/core/server';
import { ActionExecutorContract } from './action_executor';
import { ExecutorError } from './executor_error';
import { RunContext } from '../../../task_manager/server';
import { EncryptedSavedObjectsClient } from '../../../encrypted_saved_objects/server';
import {
  ActionTaskParams,
  ActionTypeRegistryContract,
  SpaceIdToNamespaceFunction,
  ActionTypeExecutorResult,
  ActionTaskExecutorParams,
  isPersistedActionTask,
} from '../types';
import { ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE } from '../constants/saved_objects';
import { asSavedObjectExecutionSource } from './action_execution_source';
import { RelatedSavedObjects, validatedRelatedSavedObjects } from './related_saved_objects';
import { injectSavedObjectReferences } from './action_task_params_utils';
import { InMemoryMetrics, IN_MEMORY_METRICS } from '../monitoring';

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
  private readonly inMemoryMetrics: InMemoryMetrics;

  constructor(actionExecutor: ActionExecutorContract, inMemoryMetrics: InMemoryMetrics) {
    this.actionExecutor = actionExecutor;
    this.inMemoryMetrics = inMemoryMetrics;
  }

  public initialize(taskRunnerContext: TaskRunnerContext) {
    if (this.isInitialized) {
      throw new Error('TaskRunnerFactory already initialized');
    }
    this.isInitialized = true;
    this.taskRunnerContext = taskRunnerContext;
  }

  public create({ taskInstance }: RunContext, maxAttempts: number = 1) {
    if (!this.isInitialized) {
      throw new Error('TaskRunnerFactory not initialized');
    }

    const { actionExecutor, inMemoryMetrics } = this;
    const {
      logger,
      encryptedSavedObjectsClient,
      spaceIdToNamespace,
      basePathService,
      getUnsecuredSavedObjectsClient,
    } = this.taskRunnerContext!;

    const taskInfo = {
      scheduled: taskInstance.runAt,
      attempts: taskInstance.attempts,
    };

    return {
      async run() {
        const actionTaskExecutorParams = taskInstance.params as ActionTaskExecutorParams;
        const { spaceId } = actionTaskExecutorParams;

        const {
          attributes: { actionId, params, apiKey, executionId, relatedSavedObjects },
          references,
        } = await getActionTaskParams(
          actionTaskExecutorParams,
          encryptedSavedObjectsClient,
          spaceIdToNamespace
        );
        const path = addSpaceIdToPath('/', spaceId);

        const request = getFakeRequest(apiKey);
        basePathService.set(request, path);

        // Throwing an executor error means we will attempt to retry the task
        // TM will treat a task as a failure if `attempts >= maxAttempts`
        // so we need to handle that here to avoid TM persisting the failed task
        const isRetryableBasedOnAttempts = taskInfo.attempts < (maxAttempts ?? 1);
        const willRetryMessage = `and will retry`;
        const willNotRetryMessage = `and will not retry`;

        let executorResult: ActionTypeExecutorResult<unknown> | undefined;
        try {
          executorResult = await actionExecutor.execute({
            params,
            actionId: actionId as string,
            isEphemeral: !isPersistedActionTask(actionTaskExecutorParams),
            request,
            ...getSourceFromReferences(references),
            taskInfo,
            executionId,
            relatedSavedObjects: validatedRelatedSavedObjects(logger, relatedSavedObjects),
          });
        } catch (e) {
          logger.error(
            `Action '${actionId}' failed ${
              isRetryableBasedOnAttempts ? willRetryMessage : willNotRetryMessage
            }: ${e.message}`
          );
          if (isRetryableBasedOnAttempts) {
            // In order for retry to work, we need to indicate to task manager this task
            // failed
            throw new ExecutorError(e.message, {}, true);
          }
        }

        inMemoryMetrics.increment(IN_MEMORY_METRICS.ACTION_EXECUTIONS);
        if (
          executorResult &&
          executorResult?.status === 'error' &&
          executorResult?.retry !== undefined &&
          isRetryableBasedOnAttempts
        ) {
          inMemoryMetrics.increment(IN_MEMORY_METRICS.ACTION_FAILURES);
          logger.error(
            `Action '${actionId}' failed ${
              !!executorResult.retry ? willRetryMessage : willNotRetryMessage
            }: ${executorResult.message}`
          );
          // Task manager error handler only kicks in when an error thrown (at this time)
          // So what we have to do is throw when the return status is `error`.
          throw new ExecutorError(
            executorResult.message,
            executorResult.data,
            executorResult.retry as boolean | Date
          );
        } else if (executorResult && executorResult?.status === 'error') {
          inMemoryMetrics.increment(IN_MEMORY_METRICS.ACTION_FAILURES);
          logger.error(
            `Action '${actionId}' failed ${willNotRetryMessage}: ${executorResult.message}`
          );
        }

        // Cleanup action_task_params object now that we're done with it
        if (isPersistedActionTask(actionTaskExecutorParams)) {
          try {
            // If the request has reached this far we can assume the user is allowed to run clean up
            // We would idealy secure every operation but in order to support clean up of legacy alerts
            // we allow this operation in an unsecured manner
            // Once support for legacy alert RBAC is dropped, this can be secured
            await getUnsecuredSavedObjectsClient(request).delete(
              ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
              actionTaskExecutorParams.actionTaskParamsId
            );
          } catch (e) {
            // Log error only, we shouldn't fail the task because of an error here (if ever there's retry logic)
            logger.error(
              `Failed to cleanup ${ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE} object [id="${actionTaskExecutorParams.actionTaskParamsId}"]: ${e.message}`
            );
          }
        }
      },
      cancel: async () => {
        // Write event log entry
        const actionTaskExecutorParams = taskInstance.params as ActionTaskExecutorParams;
        const { spaceId } = actionTaskExecutorParams;

        const {
          attributes: { actionId, apiKey, executionId, relatedSavedObjects },
          references,
        } = await getActionTaskParams(
          actionTaskExecutorParams,
          encryptedSavedObjectsClient,
          spaceIdToNamespace
        );

        const request = getFakeRequest(apiKey);
        const path = addSpaceIdToPath('/', spaceId);
        basePathService.set(request, path);

        await actionExecutor.logCancellation({
          actionId,
          request,
          executionId,
          relatedSavedObjects: (relatedSavedObjects || []) as RelatedSavedObjects,
          ...getSourceFromReferences(references),
        });

        inMemoryMetrics.increment(IN_MEMORY_METRICS.ACTION_TIMEOUTS);

        logger.debug(
          `Cancelling action task for action with id ${actionId} - execution error due to timeout.`
        );
        return { state: {} };
      },
    };
  }
}

function getFakeRequest(apiKey?: string) {
  const requestHeaders: Record<string, string> = {};
  if (apiKey) {
    requestHeaders.authorization = `ApiKey ${apiKey}`;
  }

  // Since we're using API keys and accessing elasticsearch can only be done
  // via a request, we're faking one with the proper authorization headers.
  const fakeRequest = KibanaRequest.from({
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
  } as unknown as Request);

  return fakeRequest;
}

async function getActionTaskParams(
  executorParams: ActionTaskExecutorParams,
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient,
  spaceIdToNamespace: SpaceIdToNamespaceFunction
): Promise<Omit<SavedObject<ActionTaskParams>, 'id' | 'type'>> {
  const { spaceId } = executorParams;
  const namespace = spaceIdToNamespace(spaceId);
  if (isPersistedActionTask(executorParams)) {
    const actionTask =
      await encryptedSavedObjectsClient.getDecryptedAsInternalUser<ActionTaskParams>(
        ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
        executorParams.actionTaskParamsId,
        { namespace }
      );

    const {
      attributes: { relatedSavedObjects },
      references,
    } = actionTask;

    const { actionId, relatedSavedObjects: injectedRelatedSavedObjects } =
      injectSavedObjectReferences(references, relatedSavedObjects as RelatedSavedObjects);

    return {
      ...actionTask,
      attributes: {
        ...actionTask.attributes,
        ...(actionId ? { actionId } : {}),
        ...(relatedSavedObjects ? { relatedSavedObjects: injectedRelatedSavedObjects } : {}),
      },
    };
  } else {
    return { attributes: executorParams.taskParams, references: executorParams.references ?? [] };
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
