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
 * Returns Axios options with PKI authentication
 */
export const getAxiosOptions = (
  certPath: string,
  keyPath: string,
  stream: boolean,
  apiKey?: string
): { headers: Record<string, string>; httpsAgent: https.Agent; responseType?: ResponseType } => {
  const responseType = stream ? { responseType: 'stream' as ResponseType } : {};

  // Create HTTPS agent with PKI certificates
  const httpsAgent = new https.Agent({
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
    rejectUnauthorized: false, // Allow self-signed certificates
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  return {
    headers,
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
