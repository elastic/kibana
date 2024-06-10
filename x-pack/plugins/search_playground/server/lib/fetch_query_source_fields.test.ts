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
          },
          {
            index: 'workplace_index2',
            doc: ELSER_PASSAGE_CHUNKED_TWO_INDICES_DOCS[1],
          },
        ])
      ).toEqual({
        workplace_index: {
          bm25_query_fields: [
            'metadata.summary',
            'metadata.rolePermissions',
            'text',
            'metadata.name',
          ],
          dense_vector_query_fields: [],
          elser_query_fields: [
            {
              field: 'vector.tokens',
              model_id: '.elser_model_2',
              nested: false,
              indices: ['workplace_index'],
            },
          ],
          skipped_fields: 8,
          source_fields: ['metadata.summary', 'metadata.rolePermissions', 'text', 'metadata.name'],
        },
        workplace_index2: {
          bm25_query_fields: [
            'metadata.summary',
            'content',
            'metadata.rolePermissions',
            'metadata.name',
          ],
          dense_vector_query_fields: [],
          skipped_fields: 8,
          elser_query_fields: [
            {
              field: 'content_vector.tokens',
              model_id: '.elser_model_2',
              nested: false,
              indices: ['workplace_index2'],
            },
          ],
          source_fields: [
            'metadata.summary',
            'content',
            'metadata.rolePermissions',
            'metadata.name',
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
          },
        ])
      ).toEqual({
        'search-example-main': {
          bm25_query_fields: [
            'page_content_key',
            'title',
            'main_button.button_title',
            'page_notification',
            'bread_crumbs',
            'url',
            'page_content_text',
            'buttons.button_title',
            'filter_list',
            'buttons.button_link',
            'buttons.button_new_tab',
            'title_text',
            'main_button.button_link',
          ],
          dense_vector_query_fields: [
            {
              field: 'page_content_e5_embbeding.predicted_value',
              model_id: '.multilingual-e5-small_linux-x86_64',
              nested: false,
              indices: ['search-example-main'],
            },
          ],
          elser_query_fields: [],
          skipped_fields: 30,
          source_fields: [
            'page_content_key',
            'title',
            'main_button.button_title',
            'page_notification',
            'bread_crumbs',
            'url',
            'page_content_text',
            'buttons.button_title',
            'filter_list',
            'buttons.button_link',
            'buttons.button_new_tab',
            'title_text',
            'main_button.button_link',
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
          },
        ])
      ).toEqual({
        'search-nethys': {
          bm25_query_fields: ['body_content', 'headings', 'title'],
          dense_vector_query_fields: [],
          elser_query_fields: [
            {
              field: 'ml.inference.body_content_expanded.predicted_value',
              indices: ['search-nethys'],
              model_id: '.elser_model_2_linux-x86_64',
              nested: false,
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
          },
        ])
      ).toEqual({
        workplace_index_nested: {
          bm25_query_fields: [
            'metadata.category',
            'content',
            'metadata.url',
            'metadata.rolePermissions',
            'metadata.name',
            'passages.text',
            'metadata.summary',
            'metadata.content',
          ],
          dense_vector_query_fields: [],
          elser_query_fields: [],
          source_fields: [
            'metadata.category',
            'content',
            'metadata.url',
            'metadata.rolePermissions',
            'metadata.name',
            'passages.text',
            'metadata.summary',
            'metadata.content',
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
              nested: false,
            },
          ],
          elser_query_fields: [],
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
              nested: false,
            },
          ],
          dense_vector_query_fields: [],
          source_fields: ['text'],
          skipped_fields: 2,
        },
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

    it('should perform a search request with the correct parameters with top level model id', async () => {
      const client = {
        asCurrentUser: {
          fieldCaps: jest.fn().mockResolvedValue(SPARSE_INPUT_OUTPUT_ONE_INDEX_FIELD_CAPS),
          search: jest.fn().mockResolvedValue(SPARSE_INPUT_OUTPUT_ONE_INDEX),
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
