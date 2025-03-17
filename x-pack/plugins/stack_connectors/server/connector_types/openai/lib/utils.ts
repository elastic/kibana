/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 *
 * PKI functionality added by: Antonio Piazza @antman1p
 */

import { AxiosResponse, ResponseType } from 'axios';
import { IncomingMessage } from 'http';
import { OpenAiProviderType } from '../../../../common/openai/constants';
import { Config } from '../../../../common/openai/types'; // Import Config type
import {
  sanitizeRequest as openAiSanitizeRequest,
  getRequestWithStreamOption as openAiGetRequestWithStreamOption,
} from './openai_utils';
import {
  sanitizeRequest as azureAiSanitizeRequest,
  getRequestWithStreamOption as azureAiGetRequestWithStreamOption,
} from './azure_openai_utils';
import fs from 'fs';
import https from 'https';

export const sanitizeRequest = (
  provider: string,
  url: string,
  body: string,
  defaultModel?: string
): string => {
  switch (provider) {
    case OpenAiProviderType.OpenAi:
      return openAiSanitizeRequest(url, body, defaultModel!);
    case OpenAiProviderType.AzureAi:
      return azureAiSanitizeRequest(url, body);
    default:
      return body;
  }
};

export function getRequestWithStreamOption(
  provider: OpenAiProviderType.OpenAi,
  url: string,
  body: string,
  stream: boolean,
  defaultModel: string
): string;

export function getRequestWithStreamOption(
  provider: OpenAiProviderType.AzureAi,
  url: string,
  body: string,
  stream: boolean
): string;

export function getRequestWithStreamOption(
  provider: OpenAiProviderType,
  url: string,
  body: string,
  stream: boolean,
  defaultModel?: string
): string;

export function getRequestWithStreamOption(
  provider: string,
  url: string,
  body: string,
  stream: boolean,
  defaultModel?: string
): string {
  switch (provider) {
    case OpenAiProviderType.OpenAi:
      return openAiGetRequestWithStreamOption(url, body, stream, defaultModel!);
    case OpenAiProviderType.AzureAi:
      return azureAiGetRequestWithStreamOption(url, body, stream);
    default:
      return body;
  }
}

export const getAxiosOptions = (
  provider: string,
  apiKey: string,
  stream: boolean,
  config?: Config
): { headers: Record<string, string>; httpsAgent?: https.Agent; responseType?: ResponseType } => {
  const responseType = stream ? { responseType: 'stream' as ResponseType } : {};

  switch (provider) {
    case OpenAiProviderType.OpenAi:
      return {
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        ...responseType,
      };
    case OpenAiProviderType.AzureAi:
      return {
        headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
        ...responseType,
      };
    case OpenAiProviderType.PkiOpenAi:
      if (!config?.certPath || !config?.keyPath) {
        throw new Error('Certificate and key paths are required for PKI authentication');
      }
      const httpsAgent = new https.Agent({
        cert: fs.readFileSync(config.certPath),
        key: fs.readFileSync(config.keyPath),
        rejectUnauthorized: false, // Allow self-signed certificates
      });
      return {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        httpsAgent,
        ...responseType,
      };
    default:
      return { headers: {} };
  }
};

export const pipeStreamingResponse = (response: AxiosResponse<IncomingMessage>) => {
  // Streaming responses are compressed by the Hapi router by default
  // Set content-type to something that's not recognized by Hapi to circumvent this
  response.data.headers = {
    'Content-Type': 'dont-compress-this',
  };
  return response.data;
};

export const getAzureApiVersionParameter = (url: string): string | undefined => {
  const urlSearchParams = new URLSearchParams(new URL(url).search);
  return urlSearchParams.get('api-version') ?? undefined;
};
