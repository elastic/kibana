/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OPENAI_CHAT_URL, OPENAI_LEGACY_COMPLETION_URL } from '../../../../common/openai/constants';
import fs from 'fs';

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
  try {
    const jsonBody = JSON.parse(body);
    if (jsonBody) {
      if (APIS_ALLOWING_STREAMING.has(url)) {
        jsonBody.stream = stream;
      }
      jsonBody.model = jsonBody.model || defaultModel;
    }

    return JSON.stringify(jsonBody);
  } catch (err) {
    // swallow the error
  }

  return body;
};

// removes the chat completions endpoint from the OpenAI url in order
// to provide the correct endpoint for the OpenAI node package
export const removeEndpointFromUrl = (url: string): string => {
  const endpointToRemove = /\/chat\/completions\/?$/;
  return url.replace(endpointToRemove, '');
};

// Add PKI specific utilities if needed
export const validatePKICertificates = (certPath: string, keyPath: string): boolean => {
  try {
    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
      return false;
    }
    // Basic validation that files exist and are readable
    fs.accessSync(certPath, fs.constants.R_OK);
    fs.accessSync(keyPath, fs.constants.R_OK);
    return true;
  } catch (error) {
    return false;
  }
};