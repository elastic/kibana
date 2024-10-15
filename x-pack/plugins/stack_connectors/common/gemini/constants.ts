/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const GEMINI_TITLE = i18n.translate(
  'xpack.stackConnectors.components.gemini.connectorTypeTitle',
  {
    defaultMessage: 'Google Gemini',
  }
);
export const GEMINI_CONNECTOR_ID = '.gemini';
export enum SUB_ACTION {
  RUN = 'run',
  DASHBOARD = 'getDashboard',
  TEST = 'test',
  INVOKE_AI = 'invokeAI',
  INVOKE_AI_RAW = 'invokeAIRaw',
  INVOKE_STREAM = 'invokeStream',
}

export const DEFAULT_TOKEN_LIMIT = 8192;
export const DEFAULT_TIMEOUT_MS = 60000;
export const DEFAULT_GCP_REGION = 'us-central1';
export const DEFAULT_GEMINI_MODEL = 'gemini-1.5-pro-002';
export const DEFAULT_GEMINI_URL = `https://us-central1-aiplatform.googleapis.com` as const;
