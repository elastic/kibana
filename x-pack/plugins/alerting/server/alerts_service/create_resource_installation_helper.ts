/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { Logger } from '@kbn/core/server';
import { IRuleTypeAlerts } from '../types';

export interface InitializationPromise {
  result: boolean;
  error?: string;
}
export interface ResourceInstallationHelper {
  add: (context: IRuleTypeAlerts, namespace?: string, timeoutMs?: number) => void;
  getInitializedContext: (context: string, namespace: string) => Promise<InitializationPromise>;
}

/**
 * Helper function that queues up resources to initialize until we are
 * ready to begin initialization. Once we're ready, we start taking from
 * the queue and kicking off initialization.
 *
 * If a resource is added after we begin initialization, we push it onto
 * the queue and the running loop will handle it
 *
 * If a resource is added to the queue when the processing loop is not
 * running, kick off the processing loop
 */
export function createResourceInstallationHelper(
  logger: Logger,
  commonResourcesInitPromise: Promise<InitializationPromise>,
  installFn: (context: IRuleTypeAlerts, namespace: string, timeoutMs?: number) => Promise<void>
): ResourceInstallationHelper {
  const initializedContexts: Map<string, Promise<InitializationPromise>> = new Map();

  const waitUntilContextResourcesInstalled = async (
    context: IRuleTypeAlerts,
    namespace: string = DEFAULT_NAMESPACE_STRING,
    timeoutMs?: number
  ): Promise<InitializationPromise> => {
    try {
      const { result: commonInitResult, error: commonInitError } = await commonResourcesInitPromise;
      if (commonInitResult) {
        await installFn(context, namespace, timeoutMs);
        return successResult();
      } else {
        logger.warn(
          `Common resources were not initialized, cannot initialize context for ${context.context}`
        );
        return errorResult(commonInitError);
      }
    } catch (err) {
      logger.error(`Error initializing context ${context.context} - ${err.message}`);
      return errorResult(err.message);
    }
  };

  return {
    add: (
      context: IRuleTypeAlerts,
      namespace: string = DEFAULT_NAMESPACE_STRING,
      timeoutMs?: number
    ) => {
      initializedContexts.set(
        `${context.context}_${namespace}`,

        // Return a promise than can be checked when needed
        waitUntilContextResourcesInstalled(context, namespace, timeoutMs)
      );
    },
    getInitializedContext: async (
      context: string,
      namespace: string
    ): Promise<InitializationPromise> => {
      const key = `${context}_${namespace}`;
      return initializedContexts.has(key)
        ? initializedContexts.get(key)!
        : errorResult(`Unrecognized context ${key}`);
    },
  };
}

export const successResult = () => ({ result: true });
export const errorResult = (error?: string) => ({ result: false, error });
