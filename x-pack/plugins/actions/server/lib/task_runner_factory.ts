/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAPIKey, invalidateAPIKey } from '../../../alerting/common/api_key_functions';
import { SecurityPluginSetup } from '../../../security/server';
import { ActionExecutorContract } from './action_executor';
import { ExecutorError } from './executor_error';
import { Logger, CoreStart, KibanaRequest } from '../../../../../src/core/server';
import { RunContext } from '../../../task_manager/server';
import { EncryptedSavedObjectsPluginStart } from '../../../encrypted_saved_objects/server';
import { ActionTypeDisabledError } from './errors';
import {
  ActionTaskParams,
  ActionTypeRegistryContract,
  GetBasePathFunction,
  SpaceIdToNamespaceFunction,
  ActionTypeExecutorResult,
} from '../types';

export interface TaskRunnerContext {
  logger: Logger;
  actionTypeRegistry: ActionTypeRegistryContract;
  encryptedSavedObjectsPlugin: EncryptedSavedObjectsPluginStart;
  spaceIdToNamespace: SpaceIdToNamespaceFunction;
  getBasePath: GetBasePathFunction;
  getScopedSavedObjectsClient: CoreStart['savedObjects']['getScopedClient'];
  securityPluginSetup?: SecurityPluginSetup;
}

export class TaskRunnerFactory {
  private isInitialized = false;
  private taskRunnerContext?: TaskRunnerContext;
  private readonly actionExecutor: ActionExecutorContract;
  private subApiKeyId?: string;

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
    let { subApiKeyId } = this;
    const {
      logger,
      encryptedSavedObjectsPlugin,
      spaceIdToNamespace,
      getBasePath,
      getScopedSavedObjectsClient,
      securityPluginSetup,
    } = this.taskRunnerContext!;

    const getSubApiKey = async (spaceId: string, apiKey: string) => {
      const requestHeaders: Record<string, string> = { authorization: `ApiKey ${apiKey}` };
      const fakeRequest = {
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
      const createResult = await createAPIKey(
        (fakeRequest as unknown) as KibanaRequest,
        securityPluginSetup!
      );
      if (createResult.apiKeysEnabled) {
        return createResult.result;
      }
    };

    return {
      async run() {
        const { spaceId, actionTaskParamsId } = taskInstance.params as Record<string, string>;
        const namespace = spaceIdToNamespace(spaceId);

        const {
          attributes: { actionId, params, apiKey },
        } = await encryptedSavedObjectsPlugin.getDecryptedAsInternalUser<ActionTaskParams>(
          'action_task_params',
          actionTaskParamsId,
          { namespace }
        );

        const requestHeaders: Record<string, string> = {};

        if (apiKey) {
          const subApiKeyResult = await getSubApiKey(spaceId, apiKey);
          if (subApiKeyResult) {
            const apiKeyHeaderValue = Buffer.from(
              `${subApiKeyResult.id}:${subApiKeyResult.api_key}`
            ).toString('base64');
            requestHeaders.authorization = `ApiKey ${apiKeyHeaderValue}`;
            subApiKeyId = subApiKeyResult.id;
          }
        }

        // Since we're using API keys and accessing elasticsearch can only be done
        // via a request, we're faking one with the proper authorization headers.
        const fakeRequest = ({
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
        } as unknown) as KibanaRequest;

        let executorResult: ActionTypeExecutorResult;
        try {
          executorResult = await actionExecutor.execute({
            params,
            actionId,
            request: fakeRequest,
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
          const savedObjectsClient = getScopedSavedObjectsClient(fakeRequest);
          await savedObjectsClient.delete('action_task_params', actionTaskParamsId);
        } catch (e) {
          // Log error only, we shouldn't fail the task because of an error here (if ever there's retry logic)
          logger.error(
            `Failed to cleanup action_task_params object [id="${actionTaskParamsId}"]: ${e.message}`
          );
        } finally {
          // if subApiKey exists, it should be invalidated after usage
          if (subApiKeyId) {
            await invalidateAPIKey({ id: subApiKeyId }, securityPluginSetup!);
          }
        }
      },
    };
  }
}
