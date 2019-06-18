/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import fetch, { Response } from 'node-fetch';
import { streamToString } from './streams';

export async function getResponse(url: string): Promise<Response> {
  try {
    const response = await fetch(url);
    if (response.ok) {
      return response;
    } else {
      throw new Boom(response.statusText, { statusCode: response.status });
    }
  } catch (e) {
    throw Boom.boomify(e);
  }
}

export async function getResponseStream(url: string): Promise<NodeJS.ReadableStream> {
  const res = await getResponse(url);
  return res.body;
}

export async function fetchUrl(url: string): Promise<string> {
  return getResponseStream(url).then(streamToString);
}
