/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch, { FetchError } from 'node-fetch';
import type { RequestInit, Response } from 'node-fetch';
import { fetchBuilder, MemoryCache } from 'node-fetch-cache';
import pRetry from 'p-retry';

import { streamToString } from '../streams';
import { appContextService } from '../../app_context';
import { RegistryError, RegistryConnectionError, RegistryResponseError } from '../../../errors';

import { getProxyAgent, getRegistryProxyUrl } from './proxy';

type FailedAttemptErrors = pRetry.FailedAttemptError | FetchError | Error;

const fetchWithCache = fetchBuilder.withCache(
  new MemoryCache({
    ttl: 1000 * 60 * 10, // Time to live. How long (in ms) responses remain cached before being automatically ejected. If undefined, responses are never automatically ejected from the cache.
  })
);

// not sure what to call this function, but we're not exporting it
async function registryFetch(url: string, withCache?: boolean) {
  const response = withCache
    ? await fetchWithCache(url, getFetchOptions(url))
    : await fetch(url, getFetchOptions(url));
  if (response.ok) {
    return response;
  } else {
    // 4xx & 5xx responses
    const { status, statusText, url: resUrl } = response;
    const message = `'${status} ${statusText}' error response from package registry at ${
      resUrl || url
    }`;
    const responseError = new RegistryResponseError(message, status);

    throw new pRetry.AbortError(responseError);
  }
}

export interface RequestOptions {
  retries?: number;
  withCache: boolean;
}

export async function getResponse(url: string, options?: RequestOptions): Promise<Response> {
  try {
    // we only want to retry certain failures like network issues
    // the rest should only try the one time then fail as they do now
    const response = await pRetry(() => registryFetch(url, options?.withCache), {
      factor: 2,
      retries: options?.retries ?? 5,
      onFailedAttempt: (error) => {
        // we only want to retry certain types of errors, like `ECONNREFUSED` and other operational errors
        // and let the others through without retrying
        //
        // throwing in onFailedAttempt will abandon all retries & fail the request
        // we only want to retry system errors, so re-throw for everything else
        if (!isSystemError(error)) {
          throw error;
        }
      },
    });
    return response;
  } catch (error) {
    // isSystemError here means we didn't succeed after max retries
    if (isSystemError(error)) {
      throw new RegistryConnectionError(`Error connecting to package registry: ${error.message}`);
    }
    // don't wrap our own errors
    if (error instanceof RegistryError) {
      throw error;
    } else {
      throw new RegistryError(error);
    }
  }
}

export async function getResponseStream(
  url: string,
  options?: RequestOptions
): Promise<NodeJS.ReadableStream> {
  const res = await getResponse(url, options);
  return res.body;
}

export async function fetchUrl(url: string, options?: RequestOptions): Promise<string> {
  return getResponseStream(url, options).then(streamToString);
}

// node-fetch throws a FetchError for those types of errors and
// "All errors originating from Node.js core are marked with error.type = 'system'"
// https://github.com/node-fetch/node-fetch/blob/master/docs/ERROR-HANDLING.md#error-handling-with-node-fetch
function isFetchError(error: FailedAttemptErrors): error is FetchError {
  return error instanceof FetchError || error.name === 'FetchError';
}

function isSystemError(error: FailedAttemptErrors): boolean {
  return isFetchError(error) && error.type === 'system';
}

export function getFetchOptions(targetUrl: string): RequestInit | undefined {
  const options: RequestInit = {
    headers: {
      'User-Agent': `Kibana/${appContextService.getKibanaVersion()} node-fetch`,
    },
  };
  const proxyUrl = getRegistryProxyUrl();
  if (!proxyUrl) {
    return options;
  }

  const logger = appContextService.getLogger();
  logger.debug(`Using ${proxyUrl} as proxy for ${targetUrl}`);

  options.agent = getProxyAgent({ proxyUrl, targetUrl });
  return options;
}
