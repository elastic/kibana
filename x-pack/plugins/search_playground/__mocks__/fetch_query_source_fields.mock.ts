/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesGetMappingResponse, SearchResponse } from '@elastic/elasticsearch/lib/api/types';

export const SPARSE_SEMANTIC_FIELD_FIELD_CAPS = {
  indices: ['test-index2'],
  fields: {
    infer_field: {
      semantic_text: {
        type: 'semantic_text',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    'infer_field.inference.chunks.embeddings': {
      sparse_vector: {
        type: 'sparse_vector',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    non_infer_field: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'infer_field.inference.chunks.text': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    'infer_field.inference': {
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    'infer_field.inference.chunks': {
      nested: {
        type: 'nested',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
  },
};

export const SPARSE_SEMANTIC_FIELD_MAPPINGS = {
  'test-index2': {
    mappings: {
      properties: {
        infer_field: {
          type: 'semantic_text',
          inference_id: 'elser-endpoint',
          model_settings: {
            task_type: 'sparse_embedding',
          },
        },
        non_infer_field: {
          type: 'text',
        },
      },
    },
  },
} as any as IndicesGetMappingResponse;

export const DENSE_SEMANTIC_FIELD_MAPPINGS = {
  'test-index2': {
    mappings: {
      properties: {
        infer_field: {
          type: 'semantic_text',
          inference_id: 'cohere',
          model_settings: {
            task_type: 'text_embedding',
            dimensions: 1536,
            similarity: 'dot_product',
          },
        },
        non_infer_field: {
          type: 'text',
        },
      },
    },
  },
} as any as IndicesGetMappingResponse;

// for when semantic_text field hasn't been mapped with task_type
// when theres no data / no inference has been performed in the field
export const DENSE_SEMANTIC_FIELD_MAPPINGS_MISSING_TASK_TYPE = {
  'test-index2': {
    mappings: {
      properties: {
        infer_field: {
          type: 'semantic_text',
          inference_id: 'cohere',
          model_settings: {
            dimensions: 1536,
            similarity: 'dot_product',
          },
        },
        non_infer_field: {
          type: 'text',
        },
      },
    },
  },
} as any as IndicesGetMappingResponse;

export const DENSE_SEMANTIC_FIELD_FIELD_CAPS = {
  indices: ['test-index2'],
  fields: {
    infer_field: {
      semantic_text: {
        type: 'semantic_text',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    'infer_field.inference.chunks.embeddings': {
      sparse_vector: {
        type: 'dense_vector',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    non_infer_field: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'infer_field.inference.chunks.text': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    'infer_field.inference': {
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    'infer_field.inference.chunks': {
      nested: {
        type: 'nested',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
  },
};

export const DENSE_SPARSE_SAME_FIELD_NAME_CAPS = {
  indices: ['cohere-embeddings', 'elser_index'],
  fields: {
    text_embedding: {
      sparse_vector: {
        type: 'sparse_vector',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['elser_index'],
      },
      dense_vector: {
        type: 'dense_vector',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['cohere-embeddings'],
      },
    },
    model_id: {
      text: { type: 'text', metadata_field: false, searchable: true, aggregatable: false },
    },
    text: { text: { type: 'text', metadata_field: false, searchable: true, aggregatable: false } },
    'model_id.keyword': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
  },
};

export const DENSE_OLD_PIPELINE_DOCS = [
  {
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: { total: { value: 1, relation: 'eq' }, max_score: null, hits: [] },
    aggregations: {
      'ml.inference.body_content.model_id': {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: '.multilingual-e5-small_linux-x86_64',
            doc_count: 1,
          },
        ],
      },
    },
  } as SearchResponse<any>,
];

export const DENSE_SPARSE_SAME_FIELD_NAME_DOCS = [
  {
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: { total: { value: 1, relation: 'eq' }, max_score: null, hits: [] },
    aggregations: {
      model_id: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [{ key: 'cohere_embeddings', doc_count: 1 }],
      },
    },
  } as SearchResponse<any>,
  {
    took: 0,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: { total: { value: 1, relation: 'eq' }, max_score: null, hits: [] },
    aggregations: {
      model_id: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [{ key: 'my-elser-model', doc_count: 1 }],
      },
    },
  } as SearchResponse<any>,
];

export const ELSER_PASSAGE_CHUNKED_TWO_INDICES_DOCS = [
  {
    took: 0,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: 1,
        relation: 'eq',
      },
      max_score: null,
      hits: [],
    },
    aggregations: {
      'vector.model_id': {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: '.elser_model_2',
            doc_count: 1,
          },
        ],
      },
    },
  } as SearchResponse<any>,
  {
    took: 0,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: 1,
        relation: 'eq',
      },
      max_score: null,
      hits: [],
    },
    aggregations: {
      'content_vector.model_id': {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: '.elser_model_2',
            doc_count: 1,
          },
        ],
      },
    },
  } as SearchResponse<any>,
];

export const DENSE_INPUT_OUTPUT_ONE_INDEX = [
  {
    took: 0,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: 1,
        relation: 'eq',
      },
      max_score: null,
      hits: [],
    },
    aggregations: {
      model_id: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: '.multilingual-e5-small',
            doc_count: 1,
          },
        ],
      },
    },
  } as SearchResponse<any>,
];

export const SPARSE_INPUT_OUTPUT_ONE_INDEX = [
  {
    took: 0,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: 1,
        relation: 'eq',
      },
      max_score: null,
      hits: [],
    },
    aggregations: {
      model_id: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: '.elser_model_2',
            doc_count: 1,
          },
        ],
      },
    },
  } as SearchResponse<any>,
];

export const SPARSE_INPUT_OUTPUT_ONE_INDEX_FIELD_CAPS = {
  indices: ['index'],
  fields: {
    text_embedding: {
      sparse_vector: {
        type: 'sparse_vector',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    text: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    model_id: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'model_id.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
  },
};

export const SPARSE_INPUT_OUTPUT_ONE_INDEX_FIELD_CAPS_MODEL_ID_KEYWORD = {
  indices: ['index'],
  fields: {
    text_embedding: {
      sparse_vector: {
        type: 'sparse_vector',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    text: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    model_id: {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
  },
};

export const DENSE_INPUT_OUTPUT_ONE_INDEX_FIELD_CAPS = {
  indices: ['index2'],
  fields: {
    text_embedding: {
      dense_vector: {
        type: 'dense_vector',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    text: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    model_id: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'model_id.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
  },
};

export const DENSE_VECTOR_DOCUMENT_FIRST = [
  {
    took: 0,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: 1,
        relation: 'eq',
      },
      max_score: null,
      hits: [],
    },
  } as SearchResponse<any>,
];

export const DENSE_VECTOR_DOCUMENT_FIRST_FIELD_CAPS = {
  indices: ['workplace_index_nested'],
  fields: {
    'passages.vector.model_id.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    metadata: {
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    'passages.vector.predicted_value': {
      dense_vector: {
        type: 'dense_vector',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'metadata.category': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    content: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'metadata.url': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'metadata.summary.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'metadata.updated_at': {
      date: {
        type: 'date',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'metadata.rolePermissions': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    passages: {
      nested: {
        type: 'nested',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    'metadata.name': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'metadata._run_ml_inference': {
      boolean: {
        type: 'boolean',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'metadata.url.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'passages.text': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'metadata.category.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'metadata.rolePermissions.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'metadata.name.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'metadata.summary': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'passages.vector': {
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    'metadata.restricted': {
      boolean: {
        type: 'boolean',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'content.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'passages.vector.model_id': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'metadata.created_on': {
      date: {
        type: 'date',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'metadata.content.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'metadata.content': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'passages.text.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
  },
};

export const ELSER_PASSAGE_CHUNKED_TWO_INDICES = {
  indices: ['workplace_index', 'workplace_index2'],
  fields: {
    'vector.tokens': {
      rank_features: {
        type: 'rank_features',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['workplace_index'],
      },
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
    },
    metadata: {
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    'metadata.rolePermissions.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'metadata.name.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'metadata.summary': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'content_vector.tokens': {
      rank_features: {
        type: 'rank_features',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index'],
      },
    },
    content: {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index'],
      },
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
    },
    'vector.model_id': {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['workplace_index'],
      },
    },
    'content.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
        indices: ['workplace_index2'],
      },
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index'],
      },
    },
    'content_vector.model_id.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
        indices: ['workplace_index2'],
      },
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index'],
      },
    },
    'metadata.summary.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'vector.model_id.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
        indices: ['workplace_index'],
      },
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
    },
    content_vector: {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index'],
      },
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
    },
    'metadata.rolePermissions': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'content_vector.model_id': {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index'],
      },
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
    },
    vector: {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index'],
      },
    },
    'text.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
        indices: ['workplace_index'],
      },
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
    },
    text: {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['workplace_index'],
      },
    },
    'metadata.name': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
  },
};

export const DENSE_PIPELINE_FIELD_CAPS = {
  indices: ['search-test-e5'],
  fields: {
    additional_urls: {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'title.stem': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    '_ingest.processors.pipeline.stem': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'headings.delimiter': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'ml.inference.body_content.model_id.prefix': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'headings.enum': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    '_ingest.processors': {
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    '_ingest.processors.types.joined': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'body_content.enum': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    links: {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    id: {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'ml.inference.body_content.model_id.joined': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    ml: {
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    'ml.inference.body_content.model_id': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'ml.inference': {
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    body_content: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    '_ingest.processors.pipeline.joined': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    domains: {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    '_ingest.processors.model_version.enum': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'body_content.joined': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    url_scheme: {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    meta_description: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'ml.inference.body_content': {
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    headings: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    '_ingest.processors.types.enum': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    last_crawled_at: {
      date: {
        type: 'date',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    '_ingest.processors.model_version.joined': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'title.delimiter': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'headings.prefix': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'title.enum': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    '_ingest.processors.pipeline.enum': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    '_ingest.processors.pipeline.prefix': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'meta_description.prefix': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    '_ingest.processors.types.delimiter': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'title.joined': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'body_content.stem': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    '_ingest.processors.types.stem': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'ml.inference.body_content.model_id.enum': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    title: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    meta_keywords: {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    '_ingest.processors.processed_timestamp': {
      date: {
        type: 'date',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'ml.inference.body_content.model_id.delimiter': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'meta_description.enum': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'meta_description.delimiter': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'title.prefix': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    '_ingest.processors.pipeline': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    _ingest: {
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    'ml.inference.body_content.is_truncated': {
      boolean: {
        type: 'boolean',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    '_ingest.processors.model_version.prefix': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    '_ingest.processors.model_version.delimiter': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    url_host: {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    url_path: {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    '_ingest.processors.model_version': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    url_path_dir3: {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    '_ingest.processors.pipeline.delimiter': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'headings.joined': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    '_ingest.processors.types': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'meta_description.joined': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'ml.inference.body_content.predicted_value': {
      dense_vector: {
        type: 'dense_vector',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    url: {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'meta_description.stem': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'ml.inference.body_content.model_id.stem': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    url_port: {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'body_content.delimiter': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    '_ingest.processors.model_version.stem': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    url_path_dir2: {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    url_path_dir1: {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    '_ingest.processors.types.prefix': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'headings.stem': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'body_content.prefix': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
  },
};

export const ELSER_PASSAGE_CHUNKED = {
  indices: ['search-nethys'],
  fields: {
    'ml.inference.body_content_expanded.is_truncated': {
      boolean: {
        type: 'boolean',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    ml: {
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    'ml.inference': {
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    body_content: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    headings: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'ml.inference.body_content_expanded.model_id': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    title: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'ml.inference.body_content_expanded.predicted_value': {
      sparse_vector: {
        type: 'sparse_vector',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
  },
};

export const SPARSE_DOC_SINGLE_INDEX = {
  took: 0,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 1,
      relation: 'eq',
    },
    max_score: null,
    hits: [],
  },
  aggregations: {
    'ml.inference.body_content_expanded.model_id': {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: '.elser_model_2_linux-x86_64',
          doc_count: 1,
        },
      ],
    },
  },
} as SearchResponse<any>;

export const DENSE_PASSAGE_FIRST_SINGLE_INDEX_FIELD_CAPS = {
  indices: ['search-example-main'],
  fields: {
    'page_content_key.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    page_content_ner: {
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    page_content_key: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'page_content_ner.entities.end_pos': {
      integer: {
        type: 'integer',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'label.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'page_content_ner.entities.class_name': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'page_content_e5_embbeding.model_id': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    title: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'page_content_ner.entities.entity': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'page_content_e5_embbeding.predicted_value': {
      dense_vector: {
        type: 'dense_vector',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'title.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    page_id: {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    page_content_e5_embbeding: {
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    category_id: {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'page_content_ner.entities.start_pos': {
      integer: {
        type: 'integer',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'main_button.button_title': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'main_button.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'main_button.button_title.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'bread_crumbs.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    main_button: {
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    'page_content_ner.entities': {
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    page_notification: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    buttons: {
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    'buttons.button_title.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'main_button.button_new_tab': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    label: {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    bread_crumbs: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'page_content_ner.predicted_value': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    url: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'url.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    page_content_text: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'buttons.button_title': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'page_content_e5_embbeding.model_id.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'page_notification.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'page_content_ner.model_id': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    filter_list: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'buttons.button_link': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'page_content_ner.entities.class_probability': {
      float: {
        type: 'float',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'buttons.button_new_tab': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    title_text: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'main_button.button_link': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    page_content: {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    updated_date: {
      date: {
        type: 'date',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'buttons.button_link.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
  },
};

export const DENSE_PASSAGE_FIRST_SINGLE_INDEX_DOC = {
  took: 0,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 1,
      relation: 'eq',
    },
    max_score: null,
    hits: [],
  },
  aggregations: {
    'page_content_e5_embbeding.model_id': {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: '.multilingual-e5-small_linux-x86_64',
          doc_count: 1,
        },
      ],
    },
  },
} as SearchResponse<any>;
