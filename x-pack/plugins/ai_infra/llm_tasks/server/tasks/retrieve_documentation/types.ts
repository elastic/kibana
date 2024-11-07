/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { FunctionCallingMode } from '@kbn/inference-common';
import type { ProductName } from '@kbn/product-doc-common';

export interface RetrieveDocumentationParams {
  /**
   * The search term to perform semantic text with.
   * E.g. "What is Kibana Lens?"
   */
  searchTerm: string;
  /**
   * Maximum number of documents to return
   * Defaults to 3.
   */
  max?: number;
  /**
   * Optional list of products to restrict the search to
   */
  products?: ProductName[];
  request: KibanaRequest;
  connectorId: string;
  functionCalling?: FunctionCallingMode;
}

export interface RetrievedDocument {
  title: string;
  url: string;
  content: string;
}

export interface RetrieveDocumentationResult {
  success: boolean;
  documents: RetrievedDocument[];
}

export type RetrieveDocumentationAPI = (
  options: RetrieveDocumentationParams
) => Promise<RetrieveDocumentationResult>;
