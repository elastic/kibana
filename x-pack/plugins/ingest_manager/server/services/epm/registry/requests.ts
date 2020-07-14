/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fetch, { Response } from 'node-fetch';
import { streamToString } from './streams';
import { RegistryError } from '../../../errors';

export async function getResponse(url: string): Promise<Response> {
  try {
    const response = await fetch(url);
    if (response.ok) {
      return response;
    } else {
      throw new RegistryError(
        `Error connecting to package registry at ${url}: ${response.statusText}`
      );
    }
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
