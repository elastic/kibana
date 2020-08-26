/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fetch, { FetchError, Response } from 'node-fetch';
import pRetry from 'p-retry';
import { streamToString } from './streams';
import { RegistryError } from '../../../errors';

type FailedAttemptErrors = pRetry.FailedAttemptError | FetchError | Error;

// not sure what to call this function, but we're not exporting it
async function registryFetch(url: string) {
  const response = await fetch(url);

  if (response.ok) {
    return response;
  } else {
    // 4xx & 5xx responses
    // exit without retry & throw RegistryError
    throw new pRetry.AbortError(
      new RegistryError(`Error connecting to package registry at ${url}: ${response.statusText}`)
    );
  }
}

export async function getResponse(url: string): Promise<Response> {
  try {
    // we only want to retry certain failures like network issues
    // the rest should only try the one time then fail as they do now
    const response = await pRetry(() => registryFetch(url), {
      factor: 2,
      retries: 5,
      onFailedAttempt: (error) => {
        // we only want to retry certain types of errors, like `ECONNREFUSED` and other operational errors
        // and let the others through without retrying
        //
        // throwing in onFailedAttempt will abandon all retries & fail the request
        // we only want to retry system errors, so throw a RegistryError for everything else
        if (!isSystemError(error)) {
          throw new RegistryError(
            `Error connecting to package registry at ${url}: ${error.message}`
          );
        }
      },
    });
    return response;
  } catch (e) {
    throw new RegistryError(`Error connecting to package registry at ${url}: ${e.message}`);
  }
}

export async function getResponseStream(url: string): Promise<NodeJS.ReadableStream> {
  const res = await getResponse(url);
  return res.body;
}

export async function fetchUrl(url: string): Promise<string> {
  return getResponseStream(url).then(streamToString);
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
