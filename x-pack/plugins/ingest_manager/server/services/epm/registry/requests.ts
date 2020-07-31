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
    console.log('registry#getResponse try', url);
    const response = await fetch(url);
    console.log('registry#getResponse', url, 'got', response);
    if (response.ok) {
      return response;
    } else {
      console.log('!response.ok');
      throw new RegistryError(
        `Error connecting to package registry at ${url}: ${response.statusText}`
      );
    }
  } catch (e) {
    console.log('registry#getResponse catch', url);
    throw new RegistryError(`Error connecting to package registry at ${url}: ${e.message}`);
  }
}

export async function getResponseStream(url: string): Promise<NodeJS.ReadableStream> {
  console.log('getResponseStream before', url);
  const res = await getResponse(url);
  console.log('getResponseStream after', res);
  return res.body;
}

export async function fetchUrl(url: string): Promise<string> {
  console.log('fetchUrl', url);
  return getResponseStream(url).then(streamToString);
}
