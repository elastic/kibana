/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DENSE_PASSAGE_FIRST_SINGLE_INDEX_DOC,
  DENSE_PASSAGE_FIRST_SINGLE_INDEX_FIELD_CAPS,
  DENSE_VECTOR_DOCUMENT_FIRST,
  DENSE_VECTOR_DOCUMENT_FIRST_FIELD_CAPS,
  ELSER_PASSAGE_CHUNKED,
  ELSER_PASSAGE_CHUNKED_TWO_INDICES,
  ELSER_PASSAGE_CHUNKED_TWO_INDICES_DOCS,
  SPARSE_DOC_SINGLE_INDEX,
  DENSE_INPUT_OUTPUT_ONE_INDEX,
  DENSE_INPUT_OUTPUT_ONE_INDEX_FIELD_CAPS,
  SPARSE_INPUT_OUTPUT_ONE_INDEX,
  SPARSE_INPUT_OUTPUT_ONE_INDEX_FIELD_CAPS,
  SPARSE_INPUT_OUTPUT_ONE_INDEX_FIELD_CAPS_MODEL_ID_KEYWORD,
  SPARSE_SEMANTIC_FIELD_FIELD_CAPS,
  SPARSE_SEMANTIC_FIELD_MAPPINGS,
  DENSE_SPARSE_SAME_FIELD_NAME_CAPS,
  DENSE_SPARSE_SAME_FIELD_NAME_DOCS,
  DENSE_SEMANTIC_FIELD_MAPPINGS,
  DENSE_SEMANTIC_FIELD_FIELD_CAPS,
  DENSE_SEMANTIC_FIELD_MAPPINGS_MISSING_TASK_TYPE,
  DENSE_PIPELINE_FIELD_CAPS,
  DENSE_OLD_PIPELINE_DOCS,
} from '../../__mocks__/fetch_query_source_fields.mock';
import {
  fetchFields,
  getModelIdFields,
  parseFieldsCapabilities,
} from './fetch_query_source_fields';

describe('fetch_query_source_fields', () => {
  describe('parseFieldsCapabilities', () => {
    it("should return the correct fields for the index 'workplace_index'", () => {
      expect(
        parseFieldsCapabilities(ELSER_PASSAGE_CHUNKED_TWO_INDICES, [
          {
            index: 'workplace_index',
            doc: ELSER_PASSAGE_CHUNKED_TWO_INDICES_DOCS[0],
            mapping: {
              workplace_index: {
                mappings: {},
              },
            },
          },
          {
            index: 'workplace_index2',
            doc: ELSER_PASSAGE_CHUNKED_TWO_INDICES_DOCS[1],
            mapping: {
              workplace_index2: {
                mappings: {},
              },
            },
          },
        ])
      ).toEqual({
        workplace_index: {
          bm25_query_fields: [
            'metadata.name',
            'metadata.rolePermissions',
            'metadata.summary',
            'text',
          ],
          dense_vector_query_fields: [],
          elser_query_fields: [
            {
              field: 'vector.tokens',
              model_id: '.elser_model_2',
              indices: ['workplace_index'],
              sparse_vector: false,
            },
          ],
          skipped_fields: 8,
          source_fields: ['metadata.name', 'metadata.rolePermissions', 'metadata.summary', 'text'],
          semantic_fields: [],
        },
        workplace_index2: {
          semantic_fields: [],
          bm25_query_fields: [
            'content',
            'metadata.name',
            'metadata.rolePermissions',
            'metadata.summary',
          ],
          dense_vector_query_fields: [],
          skipped_fields: 8,
          elser_query_fields: [
            {
              field: 'content_vector.tokens',
              model_id: '.elser_model_2',
              indices: ['workplace_index2'],
              sparse_vector: false,
            },
          ],
          source_fields: [
            'content',
            'metadata.name',
            'metadata.rolePermissions',
            'metadata.summary',
          ],
        },
      });
    });

    it('dense vector passage first - should return the correct fields', () => {
      expect(
        parseFieldsCapabilities(DENSE_PASSAGE_FIRST_SINGLE_INDEX_FIELD_CAPS, [
          {
            index: 'search-example-main',
            doc: DENSE_PASSAGE_FIRST_SINGLE_INDEX_DOC,
            mapping: {
              'search-example-main': {
                mappings: {},
              },
            },
          },
        ])
      ).toEqual({
        'search-example-main': {
          semantic_fields: [],
          bm25_query_fields: [
            'bread_crumbs',
            'buttons.button_link',
            'buttons.button_new_tab',
            'buttons.button_title',
            'filter_list',
            'main_button.button_link',
            'main_button.button_title',
            'page_content_key',
            'page_content_text',
            'page_notification',
            'title',
            'title_text',
            'url',
          ],
          dense_vector_query_fields: [
            {
              field: 'page_content_e5_embbeding.predicted_value',
              model_id: '.multilingual-e5-small_linux-x86_64',
              indices: ['search-example-main'],
            },
          ],
          elser_query_fields: [],
          skipped_fields: 30,
          source_fields: [
            'bread_crumbs',
            'buttons.button_link',
            'buttons.button_new_tab',
            'buttons.button_title',
            'filter_list',
            'main_button.button_link',
            'main_button.button_title',
            'page_content_key',
            'page_content_text',
            'page_notification',
            'title',
            'title_text',
            'url',
          ],
        },
      });
    });

    it('sparse vector passage first - should handle sparse_vector type fields', () => {
      expect(
        parseFieldsCapabilities(ELSER_PASSAGE_CHUNKED, [
          {
            index: 'search-nethys',
            doc: SPARSE_DOC_SINGLE_INDEX,
            mapping: {
              'search-nethys': {
                mappings: {},
              },
            },
          },
        ])
      ).toEqual({
        'search-nethys': {
          bm25_query_fields: ['body_content', 'headings', 'title'],
          dense_vector_query_fields: [],
          semantic_fields: [],
          elser_query_fields: [
            {
              field: 'ml.inference.body_content_expanded.predicted_value',
              indices: ['search-nethys'],
              model_id: '.elser_model_2_linux-x86_64',
              sparse_vector: true,
            },
          ],
          source_fields: ['body_content', 'headings', 'title'],
          skipped_fields: 4,
        },
      });
    });

    it('should return the correct fields for a document first index', () => {
      // Skips the nested dense vector field.
      expect(
        parseFieldsCapabilities(DENSE_VECTOR_DOCUMENT_FIRST_FIELD_CAPS, [
          {
            index: 'workplace_index_nested',
            doc: DENSE_VECTOR_DOCUMENT_FIRST[0],
            mapping: {
              workplace_index_nested: {
                mappings: {},
              },
            },
          },
        ])
      ).toEqual({
        workplace_index_nested: {
          bm25_query_fields: [
            'content',
            'metadata.category',
            'metadata.content',
            'metadata.name',
            'metadata.rolePermissions',
            'metadata.summary',
            'metadata.url',
            'passages.text',
          ],
          dense_vector_query_fields: [],
          elser_query_fields: [],
          semantic_fields: [],
          source_fields: [
            'content',
            'metadata.category',
            'metadata.content',
            'metadata.name',
            'metadata.rolePermissions',
            'metadata.summary',
            'metadata.url',
            'passages.text',
          ],
          skipped_fields: 18,
        },
      });
    });

    it('should return the correct fields for dense vector using input_output configuration', () => {
      expect(
        parseFieldsCapabilities(DENSE_INPUT_OUTPUT_ONE_INDEX_FIELD_CAPS, [
          {
            index: 'index2',
            doc: DENSE_INPUT_OUTPUT_ONE_INDEX[0],
            mapping: {
              index2: {
                mappings: {},
              },
            },
          },
        ])
      ).toEqual({
        index2: {
          bm25_query_fields: ['text'],
          dense_vector_query_fields: [
            {
              field: 'text_embedding',
              indices: ['index2'],
              model_id: '.multilingual-e5-small',
            },
          ],
          elser_query_fields: [],
          semantic_fields: [],
          source_fields: ['text'],
          skipped_fields: 2,
        },
      });
    });

    it('should return the correct fields for sparse vector using input_output configuration', () => {
      expect(
        parseFieldsCapabilities(SPARSE_INPUT_OUTPUT_ONE_INDEX_FIELD_CAPS, [
          {
            index: 'index',
            doc: SPARSE_INPUT_OUTPUT_ONE_INDEX[0],
            mapping: {
              index: {
                mappings: {},
              },
            },
          },
        ])
      ).toEqual({
        index: {
          bm25_query_fields: ['text'],
          elser_query_fields: [
            {
              field: 'text_embedding',
              indices: ['index'],
              model_id: '.elser_model_2',
              sparse_vector: true,
            },
          ],
          dense_vector_query_fields: [],
          semantic_fields: [],
          source_fields: ['text'],
          skipped_fields: 2,
        },
      });
    });

    it('should return the correct field types for sparse vector and dense vector when using the same field name', () => {
      expect(
        parseFieldsCapabilities(DENSE_SPARSE_SAME_FIELD_NAME_CAPS, [
          {
            index: 'cohere-embeddings',
            doc: DENSE_SPARSE_SAME_FIELD_NAME_DOCS[0],
            mapping: {
              'cohere-embeddings': {
                mappings: {},
              },
            },
          },
          {
            index: 'elser_index',
            doc: DENSE_SPARSE_SAME_FIELD_NAME_DOCS[1],
            mapping: {
              elser_index: {
                mappings: {},
              },
            },
          },
        ])
      ).toEqual({
        'cohere-embeddings': {
          bm25_query_fields: ['text'],
          dense_vector_query_fields: [
            {
              field: 'text_embedding',
              indices: ['cohere-embeddings'],
              model_id: 'cohere_embeddings',
            },
          ],
          elser_query_fields: [],
          skipped_fields: 2,
          source_fields: ['text'],
          semantic_fields: [],
        },
        elser_index: {
          bm25_query_fields: ['text'],
          dense_vector_query_fields: [],
          elser_query_fields: [
            {
              field: 'text_embedding',
              indices: ['elser_index'],
              model_id: 'my-elser-model',
              sparse_vector: true,
            },
          ],
          skipped_fields: 2,
          source_fields: ['text'],
          semantic_fields: [],
        },
      });
    });

    describe('semantic text support', () => {
      it('should return the correct fields for semantic text - sparse', () => {
        expect(
          parseFieldsCapabilities(SPARSE_SEMANTIC_FIELD_FIELD_CAPS, [
            {
              index: 'test-index2',
              // unused
              doc: SPARSE_INPUT_OUTPUT_ONE_INDEX[0],
              mapping: SPARSE_SEMANTIC_FIELD_MAPPINGS,
            },
          ])
        ).toEqual({
          'test-index2': {
            bm25_query_fields: ['non_infer_field'],
            dense_vector_query_fields: [],
            elser_query_fields: [],
            semantic_fields: [
              {
                embeddingType: 'sparse_vector',
                field: 'infer_field',
                inferenceId: 'elser-endpoint',
                indices: ['test-index2'],
              },
            ],
            skipped_fields: 4,
            source_fields: ['infer_field', 'non_infer_field'],
          },
        });
      });

      it('should return the correct fields for semantic text - dense', () => {
        expect(
          parseFieldsCapabilities(DENSE_SEMANTIC_FIELD_FIELD_CAPS, [
            {
              index: 'test-index2',
              // unused
              doc: DENSE_INPUT_OUTPUT_ONE_INDEX[0],
              mapping: DENSE_SEMANTIC_FIELD_MAPPINGS,
            },
          ])
        ).toEqual({
          'test-index2': {
            bm25_query_fields: ['non_infer_field'],
            dense_vector_query_fields: [],
            elser_query_fields: [],
            semantic_fields: [
              {
                embeddingType: 'dense_vector',
                field: 'infer_field',
                inferenceId: 'cohere',
                indices: ['test-index2'],
              },
            ],
            skipped_fields: 4,
            source_fields: ['infer_field', 'non_infer_field'],
          },
        });
      });

      it('skips if the semantic_text field not setup correctly', () => {
        expect(
          parseFieldsCapabilities(DENSE_SEMANTIC_FIELD_FIELD_CAPS, [
            {
              index: 'test-index2',
              // unused
              doc: DENSE_INPUT_OUTPUT_ONE_INDEX[0],
              mapping: DENSE_SEMANTIC_FIELD_MAPPINGS_MISSING_TASK_TYPE,
            },
          ])
        ).toEqual({
          'test-index2': {
            bm25_query_fields: ['non_infer_field'],
            dense_vector_query_fields: [],
            elser_query_fields: [],
            semantic_fields: [],
            skipped_fields: 5, // increat by 1 for the semantic field
            source_fields: ['non_infer_field'],
          },
        });
      });
    });
  });

  describe('getModelIdFields', () => {
    it('should return the model_id field for field specific - dense', () => {
      expect(getModelIdFields(DENSE_PASSAGE_FIRST_SINGLE_INDEX_FIELD_CAPS)).toEqual([
        {
          aggField: 'page_content_e5_embbeding.model_id.keyword',
          path: 'page_content_e5_embbeding.model_id',
        },
        { aggField: 'page_content_ner.model_id', path: 'page_content_ner.model_id' },
      ]);
    });

    it('should return the model_id field for field specific - elser', () => {
      expect(getModelIdFields(DENSE_VECTOR_DOCUMENT_FIRST_FIELD_CAPS)).toEqual([
        { aggField: 'passages.vector.model_id.keyword', path: 'passages.vector.model_id' },
      ]);
    });

    it('should return top level model_id', () => {
      expect(getModelIdFields(SPARSE_INPUT_OUTPUT_ONE_INDEX_FIELD_CAPS)).toEqual([
        { aggField: 'model_id.keyword', path: 'model_id' },
      ]);
    });

    it('should return the model_id as aggField if its a keyword field', () => {
      expect(getModelIdFields(SPARSE_INPUT_OUTPUT_ONE_INDEX_FIELD_CAPS_MODEL_ID_KEYWORD)).toEqual([
        { aggField: 'model_id', path: 'model_id' },
      ]);
    });
  });

  describe('fetchFields', () => {
    it('should perform a search request with the correct parameters', async () => {
      const client = {
        asCurrentUser: {
          fieldCaps: jest.fn().mockResolvedValue(DENSE_PASSAGE_FIRST_SINGLE_INDEX_FIELD_CAPS),
          search: jest.fn().mockResolvedValue(DENSE_PASSAGE_FIRST_SINGLE_INDEX_DOC),
          indices: {
            getMapping: jest.fn().mockResolvedValue({
              'search-example-main': {
                mappings: {},
              },
            }),
          },
        },
      } as any;
      const indices = ['search-example-main'];
      await fetchFields(client, indices);
      expect(client.asCurrentUser.search).toHaveBeenCalledWith({
        index: 'search-example-main',
        body: {
          size: 0,
          aggs: {
            'page_content_e5_embbeding.model_id': {
              terms: {
                field: 'page_content_e5_embbeding.model_id.keyword',
                size: 1,
              },
            },
            'page_content_ner.model_id': {
              terms: {
                field: 'page_content_ner.model_id',
                size: 1,
              },
            },
          },
        },
      });
    });

    it('should perform a search request with the correct modelid for old style inference', async () => {
      const client = {
        asCurrentUser: {
          fieldCaps: jest.fn().mockResolvedValue(DENSE_PIPELINE_FIELD_CAPS),
          search: jest.fn().mockResolvedValue(DENSE_OLD_PIPELINE_DOCS[0]),
          indices: {
            getMapping: jest.fn().mockResolvedValue({
              'search-test-e5': {
                mappings: {},
              },
            }),
          },
        },
      } as any;
      const indices = ['search-test-e5'];
      const response = await fetchFields(client, indices);
      expect(client.asCurrentUser.search).toHaveBeenCalledWith({
        index: 'search-test-e5',
        body: {
          size: 0,
          aggs: {
            'ml.inference.body_content.model_id': {
              terms: {
                field: 'ml.inference.body_content.model_id.enum',
                size: 1,
              },
            },
          },
        },
      });
      expect(response).toEqual({
        'search-test-e5': {
          bm25_query_fields: expect.any(Array),
          dense_vector_query_fields: [
            {
              field: 'ml.inference.body_content.predicted_value',
              indices: ['search-test-e5'],
              model_id: '.multilingual-e5-small_linux-x86_64',
            },
          ],
          elser_query_fields: [],
          semantic_fields: [],
          source_fields: expect.any(Array),
          skipped_fields: 30,
        },
      });
    });

    it('should perform a search request with the correct parameters with top level model id', async () => {
      const client = {
        asCurrentUser: {
          fieldCaps: jest.fn().mockResolvedValue(SPARSE_INPUT_OUTPUT_ONE_INDEX_FIELD_CAPS),
          search: jest.fn().mockResolvedValue(SPARSE_INPUT_OUTPUT_ONE_INDEX),
          indices: {
            getMapping: jest.fn().mockResolvedValue({
              index: {
                mappings: {},
              },
            }),
          },
        },
      } as any;
      const indices = ['index'];
      await fetchFields(client, indices);
      expect(client.asCurrentUser.search).toHaveBeenCalledWith({
        index: 'index',
        body: {
          size: 0,
          aggs: {
            model_id: {
              terms: {
                field: 'model_id.keyword',
                size: 1,
              },
            },
          },
        },
      });
    });
  });
});
