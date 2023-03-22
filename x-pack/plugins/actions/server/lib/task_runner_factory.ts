/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { pick } from 'lodash';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/server';
import {
  Logger,
  SavedObjectsClientContract,
  KibanaRequest,
  CoreKibanaRequest,
  IBasePath,
  SavedObject,
  Headers,
  FakeRawRequest,
  SavedObjectReference,
} from '@kbn/core/server';
import { RunContext } from '@kbn/task-manager-plugin/server';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { throwRetryableError } from '@kbn/task-manager-plugin/server/task_running';
import { ActionExecutorContract } from './action_executor';
import {
  ActionTaskParams,
  ActionTypeRegistryContract,
  SpaceIdToNamespaceFunction,
  ActionTypeExecutorResult,
  ActionTaskExecutorParams,
  isPersistedActionTask,
} from '../types';
import { ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE } from '../constants/saved_objects';
import {
  ActionExecutionSourceType,
  asEmptySource,
  asSavedObjectExecutionSource,
} from './action_execution_source';
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
    const actionExecutionId = uuidv4();

    return {
      async run() {
        const actionTaskExecutorParams = taskInstance.params as ActionTaskExecutorParams;
        const { spaceId } = actionTaskExecutorParams;

        const {
          attributes: {
            actionId,
            params,
            apiKey,
            executionId,
            consumer,
            source,
            relatedSavedObjects,
          },
          references,
        } = await getActionTaskParams(
          actionTaskExecutorParams,
          encryptedSavedObjectsClient,
          spaceIdToNamespace
        );
        const path = addSpaceIdToPath('/', spaceId);

        const request = getFakeRequest(apiKey);
        basePathService.set(request, path);

        // TM will treat a task as a failure if `attempts >= maxAttempts`
        // so we need to handle that here to avoid TM persisting the failed task
        const isRetryableBasedOnAttempts = taskInfo.attempts < maxAttempts;
        const willRetryMessage = `and will retry`;
        const willNotRetryMessage = `and will not retry`;

        let executorResult: ActionTypeExecutorResult<unknown> | undefined;
        try {
          executorResult = await actionExecutor.execute({
            params,
            actionId: actionId as string,
            isEphemeral: !isPersistedActionTask(actionTaskExecutorParams),
            request,
            taskInfo,
            executionId,
            consumer,
            relatedSavedObjects: validatedRelatedSavedObjects(logger, relatedSavedObjects),
            actionExecutionId,
            ...getSource(references, source),
          });
        } catch (e) {
          logger.error(
            `Action '${actionId}' failed ${
              isRetryableBasedOnAttempts ? willRetryMessage : willNotRetryMessage
            }: ${e.message}`
          );
          if (isRetryableBasedOnAttempts) {
            // To retry, we will throw a Task Manager RetryableError
            throw throwRetryableError(new Error(e.message), true);
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
          // When the return status is `error`, we will throw a Task Manager RetryableError
          throw throwRetryableError(
            new Error(executorResult.message),
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
              actionTaskExecutorParams.actionTaskParamsId,
              { refresh: false }
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
          attributes: { actionId, apiKey, executionId, consumer, source, relatedSavedObjects },
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
          consumer,
          executionId,
          relatedSavedObjects: (relatedSavedObjects || []) as RelatedSavedObjects,
          actionExecutionId,
          ...getSource(references, source),
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
  const requestHeaders: Headers = {};
  if (apiKey) {
    requestHeaders.authorization = `ApiKey ${apiKey}`;
  }

  const fakeRawRequest: FakeRawRequest = {
    headers: requestHeaders,
    path: '/',
  };

  // Since we're using API keys and accessing elasticsearch can only be done
  // via a request, we're faking one with the proper authorization headers.
  const fakeRequest = CoreKibanaRequest.from(fakeRawRequest);

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

function getSource(references: SavedObjectReference[], sourceType?: string) {
  const sourceInReferences = references.find((ref) => ref.name === 'source');
  if (sourceInReferences) {
    return { source: asSavedObjectExecutionSource(pick(sourceInReferences, 'id', 'type')) };
  }

  return sourceType ? { source: asEmptySource(sourceType as ActionExecutionSourceType) } : {};
}
