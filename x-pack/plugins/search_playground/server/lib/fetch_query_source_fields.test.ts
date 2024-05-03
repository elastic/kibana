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
} from '../../__mocks__/fetch_query_source_fields.mock';
import { parseFieldsCapabilities } from './fetch_query_source_fields';

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
  });
});
