/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import fetch, { Response } from 'node-fetch';
import { streamToString } from './streams';

export function getResponse(url: string): Promise<Response> {
  return new Promise((resolve, reject) =>
    fetch(url).then((response: Response) =>
      response.ok
        ? resolve(response)
        : reject(new Boom(response.statusText, { statusCode: response.status }))
    )
  );
}

export async function getResponseStream(url: string): Promise<NodeJS.ReadableStream> {
  const res = await getResponse(url);
  return res.body;
}

export async function fetchUrl(url: string): Promise<string> {
  return getResponseStream(url).then(streamToString);
}

export async function fetchJson(url: string): Promise<object> {
  const json = await fetchUrl(url);
  const data = JSON.parse(json);
  return data;
}
