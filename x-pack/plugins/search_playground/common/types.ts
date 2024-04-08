/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type IndicesQuerySourceFields = Record<string, QuerySourceFields>;

interface ModelFields {
  field: string;
  model_id: string;
  nested: boolean;
}

export interface QuerySourceFields {
  elser_query_fields: ModelFields[];
  dense_vector_query_fields: ModelFields[];
  bm25_query_fields: string[];
  source_fields: string[];
}

export enum APIRoutes {
  POST_API_KEY = '/internal/search_playground/api_key',
  POST_CHAT_MESSAGE = '/internal/search_playground/chat',
  POST_QUERY_SOURCE_FIELDS = '/internal/search_playground/query_source_fields',
}

export enum LLMs {
  openai = 'openai',
  openai_azure = 'openai_azure',
}

export interface ChatRequestData {
  connector_id: string;
  prompt: string;
  indices: string;
  citations: boolean;
  elasticsearch_query: string;
  summarization_model?: string;
  source_fields: string;
  doc_size: number;
}
