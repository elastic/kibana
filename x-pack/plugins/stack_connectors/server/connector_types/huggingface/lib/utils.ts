/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AxiosResponse, ResponseType } from 'axios';
import { IncomingMessage } from 'http';
import { HuggingFaceProviderType } from '../../../../common/huggingFace/constants';
import {
  sanitizeRequest as openAiSanitizeRequest,
  getRequestWithStreamOption as openAiGetRequestWithStreamOption,
} from './huggingface_utils';

export const sanitizeRequest = (
  provider: string,
  url: string,
  body: string,
  defaultModel?: string
): string => {
  switch (provider) {
    case HuggingFaceProviderType.HuggingFace:
      return openAiSanitizeRequest(url, body, defaultModel!);
    default:
      return body;
  }
};

export function getRequestWithStreamOption(
  provider: HuggingFaceProviderType.HuggingFace,
  url: string,
  body: string,
  stream: boolean,
  defaultModel?: string
): string;

export function getRequestWithStreamOption(
  provider: HuggingFaceProviderType | string,
  url: string,
  body: string,
  stream: boolean,
  defaultModel?: string
): string {
  switch (provider) {
    case HuggingFaceProviderType.HuggingFace:
      return openAiGetRequestWithStreamOption(url, body, stream, defaultModel!);
    default:
      return body;
  }
}

export const getAxiosOptions = (
  provider: string,
  apiKey: string,
  stream: boolean
): { headers: Record<string, string>; responseType?: ResponseType } => {
  const responseType = stream ? { responseType: 'stream' as ResponseType } : {};
  switch (provider) {
    case HuggingFaceProviderType.HuggingFace:
      return {
        headers: { Authorization: `Bearer ${apiKey}`, ['content-type']: 'application/json' },
        ...responseType,
      };
    default:
      return { headers: {} };
  }
};

export const pipeStreamingResponse = (response: AxiosResponse<IncomingMessage>) => {
  // Streaming responses are compressed by the Hapi router by default
  // Set content-type to something that's not recognized by Hapi in order to circumvent this
  response.data.headers = {
    ['Content-Type']: 'dont-compress-this',
  };
  return response.data;
};

export const getAzureApiVersionParameter = (url: string): string | undefined => {
  const urlSearchParams = new URLSearchParams(new URL(url).search);
  return urlSearchParams.get('api-version') ?? undefined;
};
