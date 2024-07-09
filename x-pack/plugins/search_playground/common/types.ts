/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type IndicesQuerySourceFields = Record<string, QuerySourceFields>;

interface ModelField {
  field: string;
  model_id: string;
  indices: string[];
}

interface SemanticField {
  field: string;
  inferenceId: string;
  embeddingType: 'sparse_vector' | 'dense_vector';
  indices: string[];
}

export interface QuerySourceFields {
  elser_query_fields: ModelField[];
  dense_vector_query_fields: ModelField[];
  bm25_query_fields: string[];
  source_fields: string[];
  semantic_fields: SemanticField[];
  skipped_fields: number;
}

export enum APIRoutes {
  POST_API_KEY = '/internal/search_playground/api_key',
  POST_CHAT_MESSAGE = '/internal/search_playground/chat',
  POST_QUERY_SOURCE_FIELDS = '/internal/search_playground/query_source_fields',
  GET_INDICES = '/internal/search_playground/indices',
}

export enum LLMs {
  openai = 'openai',
  openai_azure = 'openai_azure',
  bedrock = 'bedrock',
  gemini = 'gemini',
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

export interface SearchPlaygroundConfigType {
  ui: {
    enabled: boolean;
  };
}

export interface ModelProvider {
  name: string;
  model: string;
  promptTokenLimit: number;
  provider: LLMs;
}
