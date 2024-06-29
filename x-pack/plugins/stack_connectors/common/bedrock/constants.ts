/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BEDROCK_TITLE = i18n.translate(
  'xpack.stackConnectors.components.bedrock.connectorTypeTitle',
  {
    defaultMessage: 'Amazon Bedrock',
  }
);
export const BEDROCK_CONNECTOR_ID = '.bedrock';
export enum SUB_ACTION {
  RUN = 'run',
  INVOKE_AI = 'invokeAI',
  INVOKE_STREAM = 'invokeStream',
  DASHBOARD = 'getDashboard',
  TEST = 'test',
}

export const DEFAULT_TIMEOUT_MS = 120000;
export const DEFAULT_TOKEN_LIMIT = 8191;
export const DEFAULT_BEDROCK_MODEL = 'anthropic.claude-3-5-sonnet-20240620-v1:0';

export const DEFAULT_BEDROCK_URL = `https://bedrock-runtime.us-east-1.amazonaws.com` as const;
