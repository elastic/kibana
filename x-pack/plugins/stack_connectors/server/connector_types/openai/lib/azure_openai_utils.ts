/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AZURE_OPENAI_CHAT_URL,
  AZURE_OPENAI_COMPLETIONS_URL,
  AZURE_OPENAI_COMPLETIONS_EXTENSIONS_URL,
} from '../../../../common/openai/constants';

const APIS_ALLOWING_STREAMING = new Set<string>([
  AZURE_OPENAI_CHAT_URL,
  AZURE_OPENAI_COMPLETIONS_URL,
  AZURE_OPENAI_COMPLETIONS_EXTENSIONS_URL,
]);

/**
 * Sanitizes the Azure Open AI request body to set stream to false
 * so users cannot specify a streaming response when the framework
 * is not prepared to handle streaming
 *
 * The stream parameter is only accepted in the Chat API, the Completion API
 * and the Completions Extensions API
 */
export const sanitizeRequest = (url: string, body: string): string => {
  return getRequestWithStreamOption(url, body, false);
};

/**
 * Intercepts the Azure Open AI request body to set the stream parameter
 *
 * The stream parameter is only accepted in the Chat API, the Completion API
 * and the Completions Extensions API
 */
export const getRequestWithStreamOption = (url: string, body: string, stream: boolean): string => {
  if (
    !Array.from(APIS_ALLOWING_STREAMING)
      .map((apiUrl: string) => transformApiUrlToRegex(apiUrl))
      .some((regex: RegExp) => url.match(regex) != null)
  ) {
    return body;
  }

  try {
    const jsonBody = JSON.parse(body);
    if (jsonBody) {
      jsonBody.stream = stream;
      if (stream) {
        jsonBody.stream_options = {
          include_usage: true,
        };
      }
    }

    return JSON.stringify(jsonBody);
  } catch (err) {
    // swallow the error
  }

  return body;
};

export const transformApiUrlToRegex = (apiUrl: string): RegExp => {
  return new RegExp(
    apiUrl
      .replaceAll(`/`, `\\/`)
      .replaceAll(`.`, `\\.`)
      .replace(`{your-resource-name}`, `[^\\.\\/]+`)
      .replace(`{deployment-id}`, `[^\\/]+`)
      .replace(`?api-version={api-version}`, ``),
    'g'
  );
};
