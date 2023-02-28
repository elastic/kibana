/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { IRuleTypeAlerts } from '../types';

export interface ResourceInstallationHelper {
  add: (context: IRuleTypeAlerts, timeoutMs?: number) => void;
  setReadyToInitialize: (timeoutMs?: number) => void;
  getInitializedContext: (
    initPromise: Promise<void>,
    context: string,
    delayMs?: number
  ) => Promise<boolean>;
}

const MAX_GET_CONTEXT_RETRIES = 10;
const CONTEXT_RETRY_DELAY_MS = 10000; // wait 10 seconds before retries

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
  initFn: (context: IRuleTypeAlerts, timeoutMs?: number) => Promise<void>
): ResourceInstallationHelper {
  let readyToInitialize = false;
  let isInitializing: boolean = false;
  const registeredContexts: string[] = [];
  const contextsToInitialize: IRuleTypeAlerts[] = [];
  const initializedContexts: Map<string, Promise<boolean>> = new Map();

  const waitUntilContextResourcesInstalled = async (
    context: IRuleTypeAlerts,
    timeoutMs?: number
  ): Promise<boolean> => {
    try {
      await initFn(context, timeoutMs);
      return true;
    } catch (err) {
      logger.error(`Error initializing context ${context.context} - ${err.message}`);
      return false;
    }
  };

  const startInitialization = (timeoutMs?: number) => {
    if (!readyToInitialize) {
      return;
    }

    setImmediate(async () => {
      isInitializing = true;
      while (contextsToInitialize.length > 0) {
        const context = contextsToInitialize.pop()!;
        initializedContexts.set(
          context.context,

          // Return a promise than can be checked when needed
          waitUntilContextResourcesInstalled(context, timeoutMs)
        );
      }
      isInitializing = false;
    });
  };
  return {
    add: (context: IRuleTypeAlerts, timeoutMs?: number) => {
      contextsToInitialize.push(context);
      registeredContexts.push(context.context);
      if (!isInitializing) {
        startInitialization(timeoutMs);
      }
    },
    setReadyToInitialize: (timeoutMs?: number) => {
      readyToInitialize = true;
      startInitialization(timeoutMs);
    },
    getInitializedContext: async (
      initPromise: Promise<void>,
      context: string,
      delayMs: number = CONTEXT_RETRY_DELAY_MS
    ): Promise<boolean> => {
      const validContext = !!registeredContexts.find((c) => c === context);
      if (validContext) {
        // If there are existing rules, they will start running before we
        // even have a chance to kick off the context initialization process.
        // This is because task manager starts before alerting and starts running
        // tasks before all plugins are done setting up.
        // Since we know the context is valid, we will delay for a bit to allow
        // the alerting plugin setup to catch up. This will increase the execution
        // time of the rule the first time that it runs after startup.

        // Wait for common resources to finish installing
        await initPromise;

        let numRetries = 0;
        while (numRetries++ < MAX_GET_CONTEXT_RETRIES) {
          if (initializedContexts.has(context)) {
            return initializedContexts.get(context)!;
          } else {
            logger.debug(
              `Delaying and retrying getInitializedContext for context ${context} - try # ${numRetries}`
            );
            await delay(delayMs);
          }
        }
      }

      return Promise.resolve(false);
    },
  };
}

const delay = (delayInMs: number) => new Promise((resolve) => setTimeout(resolve, delayInMs));
