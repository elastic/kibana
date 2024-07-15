/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesQuerySourceFields } from '../types';
import { createQuery, getDefaultQueryFields, getDefaultSourceFields } from './create_query';

describe('create_query', () => {
  const sourceFields = { index1: [], index2: [] };

  describe('createQuery', () => {
    it('should return a sparse single query', () => {
      const fields = {
        index1: ['field1'],
      };

      const fieldDescriptors: IndicesQuerySourceFields = {
        index1: {
          elser_query_fields: [
            { field: 'field1', model_id: 'model1', indices: ['index1'], sparse_vector: true },
          ],
          dense_vector_query_fields: [],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
      };

      expect(createQuery(fields, sourceFields, fieldDescriptors)).toEqual({
        retriever: {
          standard: {
            query: {
              sparse_vector: {
                field: 'field1',
                inference_id: 'model1',
                query: '{query}',
              },
            },
          },
        },
      });
    });

    it('should return a text_expansion single query', () => {
      const fields = {
        index1: ['field1'],
      };

      const fieldDescriptors: IndicesQuerySourceFields = {
        index1: {
          elser_query_fields: [
            { field: 'field1', model_id: 'model1', indices: ['index1'], sparse_vector: false },
          ],
          dense_vector_query_fields: [],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
      };

      expect(createQuery(fields, sourceFields, fieldDescriptors)).toEqual({
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
          dense_vector_query_fields: [{ field: 'field1', model_id: 'model1', indices: ['index1'] }],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
      };

      expect(createQuery(fields, sourceFields, fieldDescriptors)).toEqual({
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
            {
              field: 'field1',
              model_id: 'model1',
              indices: ['index1', 'index2'],
              sparse_vector: true,
            },
          ],
          dense_vector_query_fields: [],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
        index2: {
          elser_query_fields: [
            {
              field: 'field1',
              model_id: 'model1',
              indices: ['index1', 'index2'],
              sparse_vector: true,
            },
          ],
          dense_vector_query_fields: [],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
      };

      expect(createQuery(fields, sourceFields, fieldDescriptors)).toEqual({
        retriever: {
          standard: {
            query: {
              sparse_vector: {
                field: 'field1',
                inference_id: 'model1',
                query: '{query}',
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
            { field: 'field1', model_id: 'model1', indices: ['index1'], sparse_vector: true },
          ],
          dense_vector_query_fields: [],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
        index2: {
          elser_query_fields: [
            { field: 'field2', model_id: 'model1', indices: ['index2'], sparse_vector: true },
          ],
          dense_vector_query_fields: [],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
      };

      expect(createQuery(fields, sourceFields, fieldDescriptors)).toEqual({
        retriever: {
          rrf: {
            retrievers: [
              {
                standard: {
                  query: {
                    sparse_vector: {
                      field: 'field1',
                      inference_id: 'model1',
                      query: '{query}',
                    },
                  },
                },
              },
              {
                standard: {
                  query: {
                    sparse_vector: {
                      field: 'field2',
                      inference_id: 'model1',
                      query: '{query}',
                    },
                  },
                },
              },
            ],
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
              { field: 'field1', model_id: 'model1', indices: ['index1'], sparse_vector: true },
            ],
            dense_vector_query_fields: [],
            bm25_query_fields: ['content', 'title'],
            source_fields: [],
            skipped_fields: 0,
            semantic_fields: [],
          },
          index2: {
            elser_query_fields: [
              { field: 'field2', model_id: 'model1', indices: ['index2'], sparse_vector: true },
            ],
            dense_vector_query_fields: [],
            bm25_query_fields: [],
            source_fields: [],
            skipped_fields: 0,
            semantic_fields: [],
          },
        };

        expect(createQuery(fields, sourceFields, fieldDescriptors, { rrf: false })).toEqual({
          retriever: {
            standard: {
              query: {
                bool: {
                  should: [
                    {
                      sparse_vector: {
                        field: 'field1',
                        inference_id: 'model1',
                        query: '{query}',
                      },
                    },
                    {
                      multi_match: {
                        query: '{query}',
                        fields: ['content', 'title'],
                      },
                    },
                    {
                      sparse_vector: {
                        field: 'field2',
                        inference_id: 'model1',
                        query: '{query}',
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
              { field: 'field1', model_id: 'model1', indices: ['index1'], sparse_vector: true },
            ],
            dense_vector_query_fields: [],
            bm25_query_fields: ['content', 'title'],
            source_fields: [],
            skipped_fields: 0,
            semantic_fields: [],
          },
          index2: {
            elser_query_fields: [
              { field: 'field2', model_id: 'model1', indices: ['index2'], sparse_vector: true },
            ],
            dense_vector_query_fields: [],
            bm25_query_fields: [],
            source_fields: [],
            skipped_fields: 0,
            semantic_fields: [],
          },
        };

        expect(createQuery(fields, sourceFields, fieldDescriptors)).toEqual({
          retriever: {
            rrf: {
              retrievers: [
                {
                  standard: {
                    query: {
                      sparse_vector: {
                        field: 'field1',
                        inference_id: 'model1',
                        query: '{query}',
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
                      sparse_vector: {
                        field: 'field2',
                        inference_id: 'model1',
                        query: '{query}',
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
          dense_vector_query_fields: [{ field: 'field1', model_id: 'model1', indices: ['index1'] }],
          bm25_query_fields: ['content', 'title'],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
        index2: {
          elser_query_fields: [
            { field: 'field2', model_id: 'model1', indices: ['index2'], sparse_vector: true },
          ],
          dense_vector_query_fields: [],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
      };

      expect(createQuery(fields, sourceFields, fieldDescriptors)).toEqual({
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
          dense_vector_query_fields: [{ field: 'field1', model_id: 'model1', indices: ['index1'] }],
          bm25_query_fields: ['content', 'title'],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
      };

      expect(createQuery(fields, sourceFields, fieldDescriptors)).toEqual({
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

    describe('semantic fields', () => {
      describe('sparse_vector embedding', () => {
        it('should return a query with semantic field, specified as a source field', () => {
          // as the field is specified as a source field, it should use the nested query and manually calling the sparse_vector query
          const fields = {
            index1: ['field2', 'title', 'content'],
          };

          const fieldDescriptors: IndicesQuerySourceFields = {
            index1: {
              elser_query_fields: [],
              dense_vector_query_fields: [
                { field: 'field1', model_id: 'model1', indices: ['index1'] },
              ],
              bm25_query_fields: ['content', 'title'],
              source_fields: [],
              skipped_fields: 0,
              semantic_fields: [
                {
                  field: 'field2',
                  inferenceId: 'model2',
                  indices: ['index1'],
                  embeddingType: 'sparse_vector',
                },
              ],
            },
          };

          expect(
            createQuery(
              fields,
              {
                index1: ['field2'],
              },
              fieldDescriptors
            )
          ).toEqual({
            retriever: {
              rrf: {
                retrievers: [
                  {
                    standard: {
                      query: {
                        nested: {
                          inner_hits: {
                            _source: ['field2.inference.chunks.text'],
                            name: 'index1.field2',
                            size: 2,
                          },
                          path: 'field2.inference.chunks',
                          query: {
                            sparse_vector: {
                              field: 'field2.inference.chunks.embeddings',
                              inference_id: 'model2',
                              query: '{query}',
                            },
                          },
                        },
                      },
                    },
                  },
                  {
                    standard: {
                      query: { multi_match: { fields: ['title', 'content'], query: '{query}' } },
                    },
                  },
                ],
              },
            },
          });
        });

        it('should return a query with semantic field, specified not as a source field', () => {
          // this should fallback to using the semantic field for querying
          const fields = {
            index1: ['field2', 'title', 'content'],
          };

          const fieldDescriptors: IndicesQuerySourceFields = {
            index1: {
              elser_query_fields: [],
              dense_vector_query_fields: [
                { field: 'field1', model_id: 'model1', indices: ['index1'] },
              ],
              bm25_query_fields: ['content', 'title'],
              source_fields: [],
              skipped_fields: 0,
              semantic_fields: [
                {
                  field: 'field2',
                  inferenceId: 'model2',
                  indices: ['index1'],
                  embeddingType: 'sparse_vector',
                },
              ],
            },
          };

          expect(
            createQuery(
              fields,
              {
                index1: ['content'],
              },
              fieldDescriptors
            )
          ).toEqual({
            retriever: {
              rrf: {
                retrievers: [
                  { standard: { query: { semantic: { field: 'field2', query: '{query}' } } } },
                  {
                    standard: {
                      query: { multi_match: { fields: ['title', 'content'], query: '{query}' } },
                    },
                  },
                ],
              },
            },
          });
        });
      });

      describe('dense embedding', () => {
        it('should return a query with semantic field, specified as a source field', () => {
          // as the field is specified as a source field, it should use the nested query and manually calling the knn query
          const fields = {
            index1: ['field2', 'title', 'content'],
          };

          const fieldDescriptors: IndicesQuerySourceFields = {
            index1: {
              elser_query_fields: [],
              dense_vector_query_fields: [
                { field: 'field1', model_id: 'model1', indices: ['index1'] },
              ],
              bm25_query_fields: ['content', 'title'],
              source_fields: [],
              skipped_fields: 0,
              semantic_fields: [
                {
                  field: 'field2',
                  inferenceId: 'model2',
                  indices: ['index1'],
                  embeddingType: 'dense_vector',
                },
              ],
            },
          };

          expect(
            createQuery(
              fields,
              {
                index1: ['field2'],
              },
              fieldDescriptors
            )
          ).toEqual({
            retriever: {
              rrf: {
                retrievers: [
                  {
                    standard: {
                      query: {
                        nested: {
                          inner_hits: {
                            _source: ['field2.inference.chunks.text'],
                            name: 'index1.field2',
                            size: 2,
                          },
                          path: 'field2.inference.chunks',
                          query: {
                            knn: {
                              field: 'field2.inference.chunks.embeddings',
                              query_vector_builder: {
                                text_embedding: {
                                  model_id: 'model2',
                                  model_text: '{query}',
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                  {
                    standard: {
                      query: { multi_match: { fields: ['title', 'content'], query: '{query}' } },
                    },
                  },
                ],
              },
            },
          });
        });

        it('should return a query with semantic field, specified not as a source field', () => {
          // this should fallback to using the semantic field for querying
          const fields = {
            index1: ['field2', 'title', 'content'],
          };

          const fieldDescriptors: IndicesQuerySourceFields = {
            index1: {
              elser_query_fields: [],
              dense_vector_query_fields: [
                { field: 'field1', model_id: 'model1', indices: ['index1'] },
              ],
              bm25_query_fields: ['content', 'title'],
              source_fields: [],
              skipped_fields: 0,
              semantic_fields: [
                {
                  field: 'field2',
                  inferenceId: 'model2',
                  indices: ['index1'],
                  embeddingType: 'dense_vector',
                },
              ],
            },
          };

          expect(
            createQuery(
              fields,
              {
                index1: ['content'],
              },
              fieldDescriptors
            )
          ).toEqual({
            retriever: {
              rrf: {
                retrievers: [
                  { standard: { query: { semantic: { field: 'field2', query: '{query}' } } } },
                  {
                    standard: {
                      query: { multi_match: { fields: ['title', 'content'], query: '{query}' } },
                    },
                  },
                ],
              },
            },
          });
        });
      });
    });
  });

  describe('getDefaultQueryFields', () => {
    it('should return default ELSER query fields', () => {
      const fieldDescriptors: IndicesQuerySourceFields = {
        index1: {
          elser_query_fields: [
            { field: 'field1', model_id: 'model1', indices: ['index1'], sparse_vector: true },
          ],
          dense_vector_query_fields: [
            { field: 'field1', model_id: 'dense_model', indices: ['index1'] },
          ],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
      };

      expect(getDefaultQueryFields(fieldDescriptors)).toEqual({ index1: ['field1'] });
    });

    it('should return default elser query fields for multiple indices', () => {
      const fieldDescriptors: IndicesQuerySourceFields = {
        index1: {
          elser_query_fields: [
            { field: 'field1', model_id: 'model1', indices: ['index1'], sparse_vector: true },
          ],
          dense_vector_query_fields: [
            {
              field: 'dv_field1',
              model_id: 'dense_model',

              indices: ['index1', 'index2'],
            },
          ],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
        index2: {
          elser_query_fields: [
            { field: 'vector', model_id: 'model1', indices: ['index2'], sparse_vector: true },
          ],
          dense_vector_query_fields: [
            {
              field: 'dv_field1',
              model_id: 'dense_model',

              indices: ['index1', 'index2'],
            },
          ],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
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
            { field: 'field1', model_id: 'model1', indices: ['index1'], sparse_vector: true },
          ],
          dense_vector_query_fields: [
            {
              field: 'dv_field1',
              model_id: 'dense_model',

              indices: ['index1', 'index2'],
            },
          ],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
        },
        index2: {
          elser_query_fields: [
            { field: 'vector', model_id: 'model1', indices: ['index2'], sparse_vector: true },
          ],
          dense_vector_query_fields: [
            {
              field: 'dv_field1',
              model_id: 'dense_model',

              indices: ['index1', 'index2'],
            },
          ],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
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
            { field: 'dv_field1', model_id: 'dense_model', indices: ['index1'] },
          ],
          bm25_query_fields: [],
          source_fields: [],
          skipped_fields: 0,
          semantic_fields: [],
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
          semantic_fields: [],
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
          semantic_fields: [],
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
          semantic_fields: [],
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
          semantic_fields: [],
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
          semantic_fields: [],
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
