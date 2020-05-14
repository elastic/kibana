/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import fetch, { Response } from 'node-fetch';
import { streamToString } from './streams';
import { appContextService } from '../..';

export async function getResponse(url: string): Promise<Response> {
  const logger = appContextService.getLogger();
  try {
    const response = await fetch(url);
    if (response.ok) {
      return response;
    } else {
      logger.error(`Error connecting to package registry: ${response.statusText}`);
      throw new Boom(response.statusText, { statusCode: response.status });
    }
  } catch (e) {
    const message = `Error connecting to package registry: ${e.message}`;
    logger.error(message);
    throw new Boom(message, { statusCode: 502 });
  }
}

export async function getResponseStream(url: string): Promise<NodeJS.ReadableStream> {
  const res = await getResponse(url);
  return res.body;
}

export async function fetchUrl(url: string): Promise<string> {
  return getResponseStream(url).then(streamToString);
}
