/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { Logger } from '@kbn/core/server';

export interface InitializationPromise {
  result: boolean;
  error?: string;
}

// get multiples of 2 min
const DEFAULT_RETRY_BACKOFF_PER_ATTEMPT = 2 * 60 * 1000;
interface Retry {
  time: string; // last time retry was requested
  attempts: number; // number of retry attemps
}
export interface ResourceInstallationHelper {
  add: (namespace?: string, timeoutMs?: number) => void;
  retry: (
    namespace?: string,
    initPromise?: Promise<InitializationPromise>,
    timeoutMs?: number
  ) => void;
  getInitializedResources: (namespace: string) => Promise<InitializationPromise>;
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
  installFn: (namespace: string, timeoutMs?: number) => Promise<void>
): ResourceInstallationHelper {
  let commonInitPromise: Promise<InitializationPromise> = commonResourcesInitPromise;
  const initializedResources: Map<string, Promise<InitializationPromise>> = new Map();
  const lastRetry: Map<string, Retry> = new Map();

  const waitUntilResourcesInstalled = async (
    namespace: string = DEFAULT_NAMESPACE_STRING,
    timeoutMs?: number
  ): Promise<InitializationPromise> => {
    try {
      const { result: commonInitResult, error: commonInitError } = await commonInitPromise;
      if (commonInitResult) {
        await installFn(namespace, timeoutMs);
        return successResult();
      } else {
        logger.warn(
          `Common resources were not initialized, cannot initialize resources for ${namespace}`
        );
        return errorResult(commonInitError);
      }
    } catch (err) {
      logger.error(`Error initializing resources ${namespace} - ${err.message}`);
      return errorResult(err.message);
    }
  };

  return {
    add: (namespace: string = DEFAULT_NAMESPACE_STRING, timeoutMs?: number) => {
      initializedResources.set(
        `${namespace}`,

        // Return a promise than can be checked when needed
        waitUntilResourcesInstalled(namespace, timeoutMs)
      );
    },
    retry: (
      namespace: string = DEFAULT_NAMESPACE_STRING,
      initPromise?: Promise<InitializationPromise>,
      timeoutMs?: number
    ) => {
      const key = namespace;
      // Use the new common initialization promise if specified
      if (initPromise) {
        commonInitPromise = initPromise;
      }

      // Check the last retry time to see if we want to throttle this attempt
      const retryInfo = lastRetry.get(key);
      const shouldRetry = retryInfo ? getShouldRetry(retryInfo) : true;

      if (shouldRetry) {
        logger.info(`Retrying resource initialization for "${namespace}"`);
        // Update the last retry information
        lastRetry.set(key, {
          time: new Date().toISOString(),
          attempts: (retryInfo?.attempts ?? 0) + 1,
        });

        initializedResources.set(
          key,
          // Return a promise than can be checked when needed
          waitUntilResourcesInstalled(namespace, timeoutMs)
        );
      }
    },
    getInitializedResources: async (namespace: string): Promise<InitializationPromise> => {
      const key = namespace;
      return (
        initializedResources.has(key)
          ? initializedResources.get(key)
          : errorResult(`Unrecognized spaceId ${key}`)
      ) as InitializationPromise;
    },
  };
}

export const successResult = () => ({ result: true });
export const errorResult = (error?: string) => ({ result: false, error });

export const getShouldRetry = ({ time, attempts }: Retry) => {
  const now = new Date().valueOf();
  const nextRetryDate = new Date(time).valueOf() + calculateDelay(attempts);
  return now > nextRetryDate;
};

export const calculateDelay = (attempts: number) => {
  if (attempts === 1) {
    return 30 * 1000; // 30s
  } else {
    // 2, 4, 6, 8, etc minutes
    return DEFAULT_RETRY_BACKOFF_PER_ATTEMPT * Math.pow(2, attempts - 2);
  }
};
