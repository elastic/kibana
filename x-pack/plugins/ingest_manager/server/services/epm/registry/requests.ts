/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fetch, { Response } from 'node-fetch';
import pRetry from 'p-retry';
import { streamToString } from './streams';
import { RegistryError } from '../../../errors';

const run = async (url:string) => {
  console.log('run() await fetch', url)
  const response = await fetch(url);
  console.log(response.status, url, response)

  if (response.ok) {
    return response;
  } else {
    throw new pRetry.AbortError(new RegistryError(
      `Error connecting to package registry at ${url}: ${response.statusText}`
    ));
  }
}

export async function getResponse(url: string): Promise<Response> {
  try {
    const response = await pRetry(
      () => run(url),
      {
        factor: 2,
        retries: 5,
        onFailedAttempt: error => {

          console.log('pRetry error', error.type, error.message, error);
          if (error.type !== 'system') {
            throw new RegistryError(
              `Error connecting to package registry at ${url}: ${response.statusText}`
            );
          }
        }
      }
    );

    console.log('getResponse response', response)
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
