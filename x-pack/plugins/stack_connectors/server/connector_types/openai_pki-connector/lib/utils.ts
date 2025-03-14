/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AxiosResponse, ResponseType } from 'axios';
import { IncomingMessage } from 'http';
import fs from 'fs';
import https from 'https';
import {
  sanitizeRequest as openAiSanitizeRequest,
  getRequestWithStreamOption as openAiGetRequestWithStreamOption,
} from './openai_utils';
import {
  sanitizeRequest as otherOpenAiSanitizeRequest,
  getRequestWithStreamOption as otherOpenAiGetRequestWithStreamOption,
} from './other_openai_utils';

export const sanitizeRequest = (
  provider: string,
  url: string,
  body: string,
  defaultModel?: string
): string => {
  switch (provider) {
    case 'openai':
      return openAiSanitizeRequest(url, body, defaultModel!);
    case 'other':
      return otherOpenAiSanitizeRequest(body);
    default:
      return body;
  }
};

export function getRequestWithStreamOption(
  provider: 'openai',
  url: string,
  body: string,
  stream: boolean,
  defaultModel: string
): string;

export function getRequestWithStreamOption(
  provider: 'other',
  url: string,
  body: string,
  stream: boolean
): string;

export function getRequestWithStreamOption(
  provider: string,
  url: string,
  body: string,
  stream: boolean,
  defaultModel?: string
): string {
  switch (provider) {
    case 'openai':
      return openAiGetRequestWithStreamOption(url, body, stream, defaultModel!);
    case 'other':
      return otherOpenAiGetRequestWithStreamOption(body, stream, defaultModel);
    default:
      return body;
  }
}

/**
 * Returns Axios options, now supporting PKI authentication
 */
export const getAxiosOptions = (
  provider: string,
  certPath: string | undefined,
  keyPath: string | undefined,
  stream: boolean
): { headers: Record<string, string>; httpsAgent?: https.Agent; responseType?: ResponseType } => {
  const responseType = stream ? { responseType: 'stream' as ResponseType } : {};

  // Apply PKI authentication if cert & key paths are provided
  const httpsAgent = certPath && keyPath ? new https.Agent({
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
  }) : undefined;

  return {
    headers: { ['content-type']: 'application/json' },
    httpsAgent,
    ...responseType,
  };
};

/**
 * Pipes streaming responses from OpenAI
 */
export const pipeStreamingResponse = (response: AxiosResponse<IncomingMessage>) => {
  response.data.headers = {
    ['Content-Type']: 'dont-compress-this',
  };
  return response.data;
};
