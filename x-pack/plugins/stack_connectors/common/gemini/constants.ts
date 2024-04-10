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
  INVOKE_AI = 'invokeAI',
  INVOKE_STREAM = 'invokeStream',
  DASHBOARD = 'getDashboard',
  TEST = 'test',
}

export const DEFAULT_TOKEN_LIMIT = 30720;
export const DEFAULT_GEMINI_MODEL = 'gemini-1.0-pro-001';
export const DEFAULT_GEMINI_URL = `https://generativelanguage.googleapis.com` as const;
