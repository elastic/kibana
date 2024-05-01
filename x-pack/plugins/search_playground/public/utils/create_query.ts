/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesQuerySourceFields, QuerySourceFields } from '../types';

export type IndexFields = Record<string, string[]>;

// These fields are used to suggest the fields to use for the query
// If the field is not found in the suggested fields,
// we will use the first field for BM25 and all fields for vectors
export const SUGGESTED_SPARSE_FIELDS = [
  'vector.tokens', // LangChain field
];

export const SUGGESTED_BM25_FIELDS = [
  'title',
  'body_content',
  'page_content_text',
  'text',
  'content',
  `text_field`,
];

export const SUGGESTED_DENSE_VECTOR_FIELDS = ['content_vector.tokens'];

const SUGGESTED_SOURCE_FIELDS = [
  'body_content',
  'content',
  'text',
  'page_content_text',
  'text_field',
];

interface Matches {
  queryMatches: any[];
  knnMatches: any[];
}

interface ReRankOptions {
  rrf: boolean;
}

export function createQuery(
  fields: IndexFields,
  fieldDescriptors: IndicesQuerySourceFields,
  rerankOptions: ReRankOptions = {
    rrf: true,
  }
) {
  const indices = Object.keys(fieldDescriptors);
  const boolMatches = Object.keys(fields).reduce<Matches>(
    (acc, index) => {
      const indexFields: string[] = fields[index];
      const indexFieldDescriptors: QuerySourceFields = fieldDescriptors[index];

      const sparseMatches =
        indexFields.map((field) => {
          const elserField = indexFieldDescriptors.elser_query_fields.find(
            (x) => x.field === field
          );

          // not supporting nested fields for now
          if (elserField && !elserField.nested) {
            // when another index has the same field, we don't want to duplicate the match rule
            const hasExistingSparseMatch = acc.queryMatches.find(
              (x: any) =>
                x?.text_expansion?.[field] &&
                x?.text_expansion?.[field].model_id === elserField?.model_id
            );

            if (hasExistingSparseMatch) {
              return null;
            }

            return {
              text_expansion: {
                [elserField.field]: {
                  model_id: elserField.model_id,
                  model_text: '{query}',
                },
              },
            };
          }
          return null;
        }) || [];

      const bm25Fields = indexFields.filter((field) =>
        indexFieldDescriptors.bm25_query_fields.includes(field)
      );

      const bm25Match =
        bm25Fields.length > 0
          ? {
              multi_match: {
                query: '{query}',
                fields: bm25Fields,
              },
            }
          : null;

      const knnMatches = indexFields
        .map((field) => {
          const denseVectorField = indexFieldDescriptors.dense_vector_query_fields.find(
            (x) => x.field === field
          );

          // not supporting nested fields for now
          if (denseVectorField && !denseVectorField.nested) {
            // when the knn field isn't found in all indices, we need a filter to ensure we only use the field from the correct index
            const filter =
              denseVectorField.indices.length < indices.length
                ? { filter: { terms: { _index: denseVectorField.indices } } }
                : {};

            return {
              knn: {
                field: denseVectorField.field,
                num_candidates: 100,
                ...filter,
                query_vector_builder: {
                  text_embedding: {
                    model_id: denseVectorField.model_id,
                    model_text: '{query}',
                  },
                },
              },
            };
          }
          return null;
        })
        .filter((x) => !!x);

      const matches = [...sparseMatches, bm25Match].filter((x) => !!x);

      return {
        queryMatches: [...acc.queryMatches, ...matches],
        knnMatches: [...acc.knnMatches, ...knnMatches],
      };
    },
    {
      queryMatches: [],
      knnMatches: [],
    }
  );

  // for single Elser support to make it easy to read - skips bool query
  if (boolMatches.queryMatches.length === 1 && boolMatches.knnMatches.length === 0) {
    return {
      retriever: {
        standard: {
          query: boolMatches.queryMatches[0],
        },
      },
    };
  }

  // for single Dense vector support to make it easy to read - skips bool query
  if (boolMatches.queryMatches.length === 0 && boolMatches.knnMatches.length === 1) {
    return {
      retriever: {
        standard: {
          query: boolMatches.knnMatches[0],
        },
      },
    };
  }

  const matches = [...boolMatches.queryMatches, ...boolMatches.knnMatches];

  if (matches.length === 0) {
    return {
      retriever: {
        standard: {
          query: {
            match_all: {},
          },
        },
      },
    };
  }

  // determine if we need to use a rrf query
  if (rerankOptions.rrf) {
    const retrievers = matches.map((clause) => {
      return {
        standard: {
          query: clause,
        },
      };
    });

    return {
      retriever: {
        rrf: {
          retrievers,
        },
      },
    };
  }

  // No RRF - add all the matches (DENSE + BM25 + SPARSE) to the bool query
  return {
    retriever: {
      standard: {
        query: {
          bool: {
            should: matches,
            minimum_should_match: 1,
          },
        },
      },
    },
  };
}

export function getDefaultSourceFields(fieldDescriptors: IndicesQuerySourceFields): IndexFields {
  const indexFields = Object.keys(fieldDescriptors).reduce<IndexFields>(
    (acc: IndexFields, index: string) => {
      const indexFieldDescriptors = fieldDescriptors[index];

      // if there are no source fields, we don't need to suggest anything
      if (indexFieldDescriptors.source_fields.length === 0) {
        return {
          ...acc,
          [index]: [],
        };
      }

      const suggested = indexFieldDescriptors.source_fields.filter((x) =>
        SUGGESTED_SOURCE_FIELDS.includes(x)
      );

      const fields = suggested.length === 0 ? [indexFieldDescriptors.source_fields[0]] : suggested;

      return {
        ...acc,
        [index]: fields,
      };
    },
    {}
  );

  return indexFields;
}

export function getDefaultQueryFields(fieldDescriptors: IndicesQuerySourceFields): IndexFields {
  const indexFields = Object.keys(fieldDescriptors).reduce<IndexFields>(
    (acc: IndexFields, index: string) => {
      const indexFieldDescriptors = fieldDescriptors[index];
      const fields: string[] = [];

      if (indexFieldDescriptors.elser_query_fields.length > 0) {
        const suggested = indexFieldDescriptors.elser_query_fields.filter((x) =>
          SUGGESTED_SPARSE_FIELDS.includes(x.field)
        );
        if (suggested.length > 0) {
          fields.push(...suggested.map((x) => x.field));
        } else {
          fields.push(...indexFieldDescriptors.elser_query_fields.map((x) => x.field));
        }
      } else if (indexFieldDescriptors.dense_vector_query_fields.length > 0) {
        const suggested = indexFieldDescriptors.dense_vector_query_fields.filter((x) =>
          SUGGESTED_DENSE_VECTOR_FIELDS.includes(x.field)
        );

        if (suggested.length > 0) {
          fields.push(...suggested.map((x) => x.field));
        } else {
          fields.push(...indexFieldDescriptors.dense_vector_query_fields.map((x) => x.field));
        }
      } else if (indexFieldDescriptors.bm25_query_fields.length > 0) {
        const suggested = indexFieldDescriptors.bm25_query_fields.filter((x) =>
          SUGGESTED_BM25_FIELDS.includes(x)
        );
        if (suggested.length > 0) {
          fields.push(...suggested);
        } else {
          fields.push(indexFieldDescriptors.bm25_query_fields[0]);
        }
      }

      return {
        ...acc,
        [index]: fields,
      };
    },
    {}
  );

  return indexFields;
}
