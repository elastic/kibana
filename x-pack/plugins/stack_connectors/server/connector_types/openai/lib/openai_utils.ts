/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OPENAI_CHAT_URL, OPENAI_LEGACY_COMPLETION_URL } from '../../../../common/openai/constants';

const APIS_ALLOWING_STREAMING = new Set<string>([OPENAI_CHAT_URL, OPENAI_LEGACY_COMPLETION_URL]);

/**
 * Sanitizes the Open AI request body to set stream to false
 * so users cannot specify a streaming response when the framework
 * is not prepared to handle streaming
 *
 * The stream parameter is accepted in the ChatCompletion
 * API and the Completion API only
 */
export const sanitizeRequest = (url: string, body: string, defaultModel: string): string => {
  return getRequestWithStreamOption(url, body, false, defaultModel);
};

/**
 * Intercepts the Open AI request body to set the stream parameter
 *
 * The stream parameter is accepted in the ChatCompletion
 * API and the Completion API only
 */
export const getRequestWithStreamOption = (
  url: string,
  body: string,
  stream: boolean,
  defaultModel: string
): string => {
  if (!APIS_ALLOWING_STREAMING.has(url)) {
    return body;
  }

  try {
    const jsonBody = JSON.parse(body);
    if (jsonBody) {
      jsonBody.stream = stream;
      jsonBody.model = jsonBody.model || defaultModel;
    }

    return JSON.stringify(jsonBody);
  } catch (err) {
    // swallow the error
  }

  return body;
};
