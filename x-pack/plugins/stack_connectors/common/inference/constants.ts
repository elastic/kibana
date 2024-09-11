/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INFERENCE_CONNECTOR_TITLE = i18n.translate(
  'xpack.stackConnectors.components.inference.connectorTypeTitle',
  {
    defaultMessage: 'AI Connector',
  }
);
export const INFERENCE_CONNECTOR_ID = '.inference';
export enum SUB_ACTION {
  TEST = 'test',
  COMPLETION = 'completion',
  RERANK = 'rerank',
  TEXT_EMBEDDING = 'text_embedding',
  SPARSE_EMBEDDING = 'sparse_embedding',
}

export const DEFAULT_PROVIDER = 'openai';
export const DEFAULT_TASK_TYPE = 'completion';
