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
  CoreKibanaRequest,
  FakeRawRequest,
  Headers,
  IBasePath,
  ISavedObjectsRepository,
  Logger,
  SavedObject,
  SavedObjectReference,
  SavedObjectsErrorHelpers,
} from '@kbn/core/server';
import {
  createTaskRunError,
  RunContext,
  TaskErrorSource,
  throwRetryableError,
  throwUnrecoverableError,
} from '@kbn/task-manager-plugin/server';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { createRetryableError, getErrorSource } from '@kbn/task-manager-plugin/server/task_running';
import { ActionExecutorContract } from './action_executor';
import {
  ActionTaskExecutorParams,
  ActionTaskParams,
  ActionTypeExecutorResult,
  ActionTypeRegistryContract,
  isPersistedActionTask,
  SpaceIdToNamespaceFunction,
} from '../types';
import { ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE } from '../constants/saved_objects';
import {
  ActionExecutionSourceType,
  asEmptySource,
  asSavedObjectExecutionSource,
} from './action_execution_source';
import { RelatedSavedObjects, validatedRelatedSavedObjects } from './related_saved_objects';
import { injectSavedObjectReferences } from './action_task_params_utils';
import { IN_MEMORY_METRICS, InMemoryMetrics } from '../monitoring';
import { ActionTypeDisabledError } from './errors';

export interface TaskRunnerContext {
  logger: Logger;
  actionTypeRegistry: ActionTypeRegistryContract;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  spaceIdToNamespace: SpaceIdToNamespaceFunction;
  basePathService: IBasePath;
  savedObjectsRepository: ISavedObjectsRepository;
}

type TaskParams = Omit<SavedObject<ActionTaskParams>, 'id' | 'type'>;

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

  public create({ taskInstance }: RunContext) {
    if (!this.isInitialized) {
      throw new Error('TaskRunnerFactory not initialized');
    }

    const { actionExecutor, inMemoryMetrics } = this;
    const {
      logger,
      encryptedSavedObjectsClient,
      spaceIdToNamespace,
      basePathService,
      savedObjectsRepository,
    } = this.taskRunnerContext!;

    const taskInfo = {
      scheduled: taskInstance.runAt,
      attempts: taskInstance.attempts,
    };
    const actionExecutionId = uuidv4();
    const actionTaskExecutorParams = taskInstance.params as ActionTaskExecutorParams;

    return {
      async run() {
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

        const { spaceId } = actionTaskExecutorParams;
        const path = addSpaceIdToPath('/', spaceId);
        const request = getFakeRequest(apiKey);

        basePathService.set(request, path);

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
          logger.error(`Action '${actionId}' failed: ${e.message}`);
          if (e instanceof ActionTypeDisabledError) {
            // We'll stop re-trying due to action being forbidden
            throwUnrecoverableError(createTaskRunError(e, TaskErrorSource.USER));
          }
          throw createTaskRunError(e, getErrorSource(e) || TaskErrorSource.FRAMEWORK);
        }

        inMemoryMetrics.increment(IN_MEMORY_METRICS.ACTION_EXECUTIONS);
        if (executorResult.status === 'error') {
          inMemoryMetrics.increment(IN_MEMORY_METRICS.ACTION_FAILURES);
          logger.error(`Action '${actionId}' failed: ${executorResult.message}`);
          // Task manager error handler only kicks in when an error thrown (at this time)
          // So what we have to do is throw when the return status is `error`.
          throw throwRetryableError(
            createTaskRunError(new Error(executorResult.message), executorResult.errorSource),
            executorResult.retry as boolean | Date
          );
        }
      },
      cancel: async () => {
        // Write event log entry
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
      cleanup: async () => {
        // Cleanup action_task_params object now that we're done with it
        if (isPersistedActionTask(actionTaskExecutorParams)) {
          try {
            await savedObjectsRepository.delete(
              ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
              actionTaskExecutorParams.actionTaskParamsId,
              { refresh: false, namespace: spaceIdToNamespace(actionTaskExecutorParams.spaceId) }
            );
          } catch (e) {
            // Log error only, we shouldn't fail the task because of an error here (if ever there's retry logic)
            logger.error(
              `Failed to cleanup ${ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE} object [id="${actionTaskExecutorParams.actionTaskParamsId}"]: ${e.message}`
            );
          }
        }
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
  return CoreKibanaRequest.from(fakeRawRequest);
}

async function getActionTaskParams(
  executorParams: ActionTaskExecutorParams,
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient,
  spaceIdToNamespace: SpaceIdToNamespaceFunction
): Promise<TaskParams> {
  const { spaceId } = executorParams;
  const namespace = spaceIdToNamespace(spaceId);
  if (isPersistedActionTask(executorParams)) {
    try {
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
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw createRetryableError(createTaskRunError(e, TaskErrorSource.USER), true);
      }
      throw createRetryableError(createTaskRunError(e, TaskErrorSource.FRAMEWORK), true);
    }
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
