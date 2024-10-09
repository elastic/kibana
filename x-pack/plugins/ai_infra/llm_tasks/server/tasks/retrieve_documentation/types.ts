/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { OutputAPI } from '@kbn/inference-plugin/common/output';
import type { ChatCompleteAPI } from '@kbn/inference-plugin/common/chat_complete';
import type { FunctionCallingMode } from '@kbn/inference-plugin/common/chat_complete';
import type {
  ProductDocBaseStartContract,
  ProductDocSearchAPI,
} from '@kbn/product-doc-base-plugin/server';

export interface RetrieveDocumentationParams {
  request: KibanaRequest;
  connectorId: string;
  searchTerm: string;
  functionCalling?: FunctionCallingMode;
}

export interface DocumentRelevantChunks {
  title: string;
  url: string;
  chunks: string[];
}

export interface RetrieveDocumentationResult {
  documents: DocumentRelevantChunks[];
}

export type RetrieveDocumentationAPI = (
  options: RetrieveDocumentationParams
) => Promise<RetrieveDocumentationResult>;
