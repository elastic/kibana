/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRuleTypeAlerts } from '../types';

export interface ResourceInstallationHelper {
  add: (context: IRuleTypeAlerts, timeoutMs?: number) => void;
  setReadyToInitialize: (timeoutMs?: number) => void;
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
  initializedContexts: Map<string, Promise<boolean>>,
  initFn: (context: IRuleTypeAlerts, timeoutMs?: number) => Promise<void>
): ResourceInstallationHelper {
  let readyToInitialize = false;
  let isInitializing: boolean = false;
  const contextsToInitialize: IRuleTypeAlerts[] = [];

  const waitUntilContextResourcesInstalled = async (
    context: IRuleTypeAlerts,
    timeoutMs?: number
  ): Promise<boolean> => {
    try {
      await initFn(context, timeoutMs);
      return true;
    } catch (err) {
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
      if (!isInitializing) {
        startInitialization(timeoutMs);
      }
    },
    setReadyToInitialize: (timeoutMs?: number) => {
      readyToInitialize = true;
      startInitialization(timeoutMs);
    },
  };
}
