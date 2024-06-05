/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesQuerySourceFields } from '../types';
import { createQuery, getDefaultQueryFields, getDefaultSourceFields } from './create_query';

describe('create_query', () => {
  describe('createQuery', () => {
    it('should return a sparse single query', () => {
      const fields = {
        index1: ['field1'],
      };

      const fieldDescriptors: IndicesQuerySourceFields = {
        index1: {
          elser_query_fields: [
            { field: 'field1', model_id: 'model1', nested: false, indices: ['index1'] },
          ],
          dense_vector_query_fields: [],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
        },
      };

      expect(createQuery(fields, fieldDescriptors)).toEqual({
        retriever: {
          standard: {
            query: {
              text_expansion: {
                field1: {
                  model_id: 'model1',
                  model_text: '{query}',
                },
              },
            },
          },
        },
      });
    });

    it('should return a knn query single', () => {
      const fields = {
        index1: ['field1'],
      };

      const fieldDescriptors: IndicesQuerySourceFields = {
        index1: {
          elser_query_fields: [],
          dense_vector_query_fields: [
            { field: 'field1', model_id: 'model1', nested: false, indices: ['index1'] },
          ],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
        },
      };

      expect(createQuery(fields, fieldDescriptors)).toEqual({
        retriever: {
          standard: {
            query: {
              knn: {
                field: 'field1',
                num_candidates: 100,
                query_vector_builder: {
                  text_embedding: {
                    model_id: 'model1',
                    model_text: '{query}',
                  },
                },
              },
            },
          },
        },
      });
    });

    it('should return a query from multiple ', () => {
      const fields = {
        index1: ['field1'],
        index2: ['field1'],
      };

      const fieldDescriptors: IndicesQuerySourceFields = {
        index1: {
          elser_query_fields: [
            { field: 'field1', model_id: 'model1', nested: false, indices: ['index1', 'index2'] },
          ],
          dense_vector_query_fields: [],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
        },
        index2: {
          elser_query_fields: [
            { field: 'field1', model_id: 'model1', nested: false, indices: ['index1', 'index2'] },
          ],
          dense_vector_query_fields: [],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
        },
      };

      expect(createQuery(fields, fieldDescriptors)).toEqual({
        retriever: {
          standard: {
            query: {
              text_expansion: {
                field1: {
                  model_id: 'model1',
                  model_text: '{query}',
                },
              },
            },
          },
        },
      });
    });

    it('should return a query from multiple fields', () => {
      const fields = {
        index1: ['field1'],
        index2: ['field2'],
      };

      const fieldDescriptors: IndicesQuerySourceFields = {
        index1: {
          elser_query_fields: [
            { field: 'field1', model_id: 'model1', nested: false, indices: ['index1'] },
          ],
          dense_vector_query_fields: [],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
        },
        index2: {
          elser_query_fields: [
            { field: 'field2', model_id: 'model1', nested: false, indices: ['index2'] },
          ],
          dense_vector_query_fields: [],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
        },
      };

      expect(createQuery(fields, fieldDescriptors)).toEqual({
        retriever: {
          rrf: {
            retrievers: [
              {
                standard: {
                  query: {
                    text_expansion: {
                      field1: {
                        model_id: 'model1',
                        model_text: '{query}',
                      },
                    },
                  },
                },
              },
              {
                standard: {
                  query: {
                    text_expansion: {
                      field2: {
                        model_id: 'model1',
                        model_text: '{query}',
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      });
    });

    it('should return empty for nested dense query', () => {
      const fields = {
        index1: ['passages.field1.predicted_value'],
      };

      const fieldDescriptors: IndicesQuerySourceFields = {
        index1: {
          elser_query_fields: [],
          dense_vector_query_fields: [
            {
              field: 'passages.field1.predicted_value',
              model_id: 'model1',
              nested: true,
              indices: ['index1'],
            },
          ],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
        },
      };

      expect(createQuery(fields, fieldDescriptors)).toEqual({
        retriever: {
          standard: {
            query: {
              match_all: {},
            },
          },
        },
      });
    });

    it('should return empty for nested sparse query', () => {
      const fields = {
        index1: ['passages.field1.tokens'],
      };

      const fieldDescriptors: IndicesQuerySourceFields = {
        index1: {
          elser_query_fields: [
            {
              field: 'passages.field1.tokens',
              model_id: 'model1',
              nested: true,
              indices: ['index1'],
            },
          ],
          dense_vector_query_fields: [],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
        },
      };

      expect(createQuery(fields, fieldDescriptors)).toEqual({
        retriever: {
          standard: {
            query: {
              match_all: {},
            },
          },
        },
      });
    });

    describe('hybrid without RRF', () => {
      it('should return a hybrid query', () => {
        const fields = {
          index1: ['field1', 'content', 'title'],
          index2: ['field2'],
        };

        const fieldDescriptors: IndicesQuerySourceFields = {
          index1: {
            elser_query_fields: [
              { field: 'field1', model_id: 'model1', nested: false, indices: ['index1'] },
            ],
            dense_vector_query_fields: [],
            bm25_query_fields: ['content', 'title'],
            source_fields: [],
            skipped_fields: 0,
          },
          index2: {
            elser_query_fields: [
              { field: 'field2', model_id: 'model1', nested: false, indices: ['index2'] },
            ],
            dense_vector_query_fields: [],
            bm25_query_fields: [],
            source_fields: [],
            skipped_fields: 0,
          },
        };

        expect(createQuery(fields, fieldDescriptors, { rrf: false })).toEqual({
          retriever: {
            standard: {
              query: {
                bool: {
                  should: [
                    {
                      text_expansion: {
                        field1: {
                          model_id: 'model1',
                          model_text: '{query}',
                        },
                      },
                    },
                    {
                      multi_match: {
                        query: '{query}',
                        fields: ['content', 'title'],
                      },
                    },
                    {
                      text_expansion: {
                        field2: {
                          model_id: 'model1',
                          model_text: '{query}',
                        },
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
            },
          },
        });
      });
    });

    describe('hybrid with RRF', () => {
      it('should return a hybrid query', () => {
        const fields = {
          index1: ['field1', 'content', 'title'],
          index2: ['field2'],
        };

        const fieldDescriptors: IndicesQuerySourceFields = {
          index1: {
            elser_query_fields: [
              { field: 'field1', model_id: 'model1', nested: false, indices: ['index1'] },
            ],
            dense_vector_query_fields: [],
            bm25_query_fields: ['content', 'title'],
            source_fields: [],
            skipped_fields: 0,
          },
          index2: {
            elser_query_fields: [
              { field: 'field2', model_id: 'model1', nested: false, indices: ['index2'] },
            ],
            dense_vector_query_fields: [],
            bm25_query_fields: [],
            source_fields: [],
            skipped_fields: 0,
          },
        };

        expect(createQuery(fields, fieldDescriptors)).toEqual({
          retriever: {
            rrf: {
              retrievers: [
                {
                  standard: {
                    query: {
                      text_expansion: {
                        field1: {
                          model_id: 'model1',
                          model_text: '{query}',
                        },
                      },
                    },
                  },
                },
                {
                  standard: {
                    query: {
                      multi_match: {
                        query: '{query}',
                        fields: ['content', 'title'],
                      },
                    },
                  },
                },
                {
                  standard: {
                    query: {
                      text_expansion: {
                        field2: {
                          model_id: 'model1',
                          model_text: '{query}',
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
        });
      });
    });

    it('dense vector only', () => {
      const fields = {
        index1: ['field1'],
      };

      const fieldDescriptors: IndicesQuerySourceFields = {
        index1: {
          elser_query_fields: [],
          dense_vector_query_fields: [
            { field: 'field1', model_id: 'model1', nested: false, indices: ['index1'] },
          ],
          bm25_query_fields: ['content', 'title'],
          source_fields: [],
          skipped_fields: 0,
        },
        index2: {
          elser_query_fields: [
            { field: 'field2', model_id: 'model1', nested: false, indices: ['index2'] },
          ],
          dense_vector_query_fields: [],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
        },
      };

      expect(createQuery(fields, fieldDescriptors)).toEqual({
        retriever: {
          standard: {
            query: {
              knn: {
                field: 'field1',
                num_candidates: 100,
                filter: { terms: { _index: ['index1'] } },
                query_vector_builder: {
                  text_embedding: {
                    model_id: 'model1',
                    model_text: '{query}',
                  },
                },
              },
            },
          },
        },
      });
    });

    it('dense vector + bm25 only', () => {
      const fields = {
        index1: ['field1', 'title', 'content'],
      };

      const fieldDescriptors: IndicesQuerySourceFields = {
        index1: {
          elser_query_fields: [],
          dense_vector_query_fields: [
            { field: 'field1', model_id: 'model1', nested: false, indices: ['index1'] },
          ],
          bm25_query_fields: ['content', 'title'],
          source_fields: [],
          skipped_fields: 0,
        },
      };

      expect(createQuery(fields, fieldDescriptors)).toEqual({
        retriever: {
          rrf: {
            retrievers: [
              {
                standard: {
                  query: {
                    multi_match: {
                      query: '{query}',
                      fields: ['title', 'content'],
                    },
                  },
                },
              },
              {
                standard: {
                  query: {
                    knn: {
                      field: 'field1',
                      num_candidates: 100,
                      query_vector_builder: {
                        text_embedding: {
                          model_id: 'model1',
                          model_text: '{query}',
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      });
    });
  });

  describe('getDefaultQueryFields', () => {
    it('should return default ELSER query fields', () => {
      const fieldDescriptors: IndicesQuerySourceFields = {
        index1: {
          elser_query_fields: [
            { field: 'field1', model_id: 'model1', nested: false, indices: ['index1'] },
          ],
          dense_vector_query_fields: [
            { field: 'field1', model_id: 'dense_model', nested: false, indices: ['index1'] },
          ],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
        },
      };

      expect(getDefaultQueryFields(fieldDescriptors)).toEqual({ index1: ['field1'] });
    });

    it('should return default elser query fields for multiple indices', () => {
      const fieldDescriptors: IndicesQuerySourceFields = {
        index1: {
          elser_query_fields: [
            { field: 'field1', model_id: 'model1', nested: false, indices: ['index1'] },
          ],
          dense_vector_query_fields: [
            {
              field: 'dv_field1',
              model_id: 'dense_model',
              nested: false,
              indices: ['index1', 'index2'],
            },
          ],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
        },
        index2: {
          elser_query_fields: [
            { field: 'vector', model_id: 'model1', nested: false, indices: ['index2'] },
          ],
          dense_vector_query_fields: [
            {
              field: 'dv_field1',
              model_id: 'dense_model',
              nested: false,
              indices: ['index1', 'index2'],
            },
          ],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
        },
      };

      expect(getDefaultQueryFields(fieldDescriptors)).toEqual({
        index1: ['field1'],
        index2: ['vector'],
      });
    });

    it('should return elser query fields for default fields', () => {
      const fieldDescriptors: IndicesQuerySourceFields = {
        index1: {
          elser_query_fields: [
            { field: 'field1', model_id: 'model1', nested: false, indices: ['index1'] },
          ],
          dense_vector_query_fields: [
            {
              field: 'dv_field1',
              model_id: 'dense_model',
              nested: false,
              indices: ['index1', 'index2'],
            },
          ],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
        },
        index2: {
          elser_query_fields: [
            { field: 'vector', model_id: 'model1', nested: false, indices: ['index2'] },
          ],
          dense_vector_query_fields: [
            {
              field: 'dv_field1',
              model_id: 'dense_model',
              nested: false,
              indices: ['index1', 'index2'],
            },
          ],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
        },
      };

      expect(getDefaultQueryFields(fieldDescriptors)).toEqual({
        index1: ['field1'],
        index2: ['vector'],
      });
    });

    it('should fallback to dense vector fields for index', () => {
      const fieldDescriptors: IndicesQuerySourceFields = {
        index1: {
          elser_query_fields: [],
          dense_vector_query_fields: [
            { field: 'dv_field1', model_id: 'dense_model', nested: false, indices: ['index1'] },
          ],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
        },
      };

      expect(getDefaultQueryFields(fieldDescriptors)).toEqual({ index1: ['dv_field1'] });
    });

    it('should fallback to all BM25 fields in index, using suggested fields', () => {
      const fieldDescriptors: IndicesQuerySourceFields = {
        index1: {
          elser_query_fields: [],
          dense_vector_query_fields: [],
          bm25_query_fields: ['title', 'text', 'content'],
          source_fields: [],
          skipped_fields: 0,
        },
      };

      expect(getDefaultQueryFields(fieldDescriptors)).toEqual({
        index1: ['title', 'text', 'content'],
      });
    });

    it('should fallback to all BM25 fields in index, only using first unrecognised field', () => {
      const fieldDescriptors: IndicesQuerySourceFields = {
        index1: {
          elser_query_fields: [],
          dense_vector_query_fields: [],
          bm25_query_fields: ['unknown1', 'unknown2'],
          source_fields: [],
          skipped_fields: 0,
        },
      };

      expect(getDefaultQueryFields(fieldDescriptors)).toEqual({
        index1: ['unknown1'],
      });
    });
  });

  describe('getDefaultSourceFields', () => {
    it('should return default source fields', () => {
      const fieldDescriptors: IndicesQuerySourceFields = {
        'search-search-labs': {
          elser_query_fields: [],
          dense_vector_query_fields: [],
          bm25_query_fields: [
            'additional_urls',
            'title',
            'links',
            'id',
            'url_host',
            'url_path',
            'url_path_dir3',
            'body_content',
            'domains',
            'url',
            'url_scheme',
            'meta_description',
            'headings',
            'url_path_dir2',
            'url_path_dir1',
          ],
          source_fields: [
            'additional_urls',
            'title',
            'links',
            'id',
            'url_host',
            'url_path',
            'url_path_dir3',
            'body_content',
            'domains',
            'url',
            'url_scheme',
            'meta_description',
            'headings',
            'url_path_dir2',
            'url_path_dir1',
          ],
          skipped_fields: 0,
        },
      };

      expect(getDefaultSourceFields(fieldDescriptors)).toEqual({
        'search-search-labs': ['body_content'],
      });
    });

    it('should return undefined with index name when no source fields found', () => {
      const fieldDescriptors: IndicesQuerySourceFields = {
        'search-search-labs': {
          elser_query_fields: [],
          dense_vector_query_fields: [],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
        },
      };

      const defaultSourceFields = getDefaultSourceFields(fieldDescriptors);

      expect(defaultSourceFields).toEqual({
        'search-search-labs': [undefined],
      });
    });

    it('should return the first single field when no source fields', () => {
      const fieldDescriptors: IndicesQuerySourceFields = {
        'search-search-labs': {
          elser_query_fields: [],
          dense_vector_query_fields: [],
          bm25_query_fields: [],
          source_fields: ['non_suggested_field'],
          skipped_fields: 0,
        },
      };

      expect(getDefaultSourceFields(fieldDescriptors)).toEqual({
        'search-search-labs': ['non_suggested_field'],
      });
    });
  });
});
