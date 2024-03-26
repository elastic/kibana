/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesQuerySourceFields, QuerySourceFields } from '../types';

type IndexFields = Record<string, string[]>;

// These fields are used to suggest the fields to use for the query
// If the field is not found in the suggested fields,
// we will use the first field for BM25 and all fields for vectors
const SUGGESTED_SPARSE_FIELDS = [
  'vector.tokens', // LangChain field
];

const SUGGESTED_BM25_FIELDS = ['title', 'body_content', 'text', 'content'];

const SUGGESTED_DENSE_VECTOR_FIELDS = ['content_vector.tokens'];

const SUGGESTED_SOURCE_FIELDS = ['body_content', 'content', 'text'];

interface Matches {
  queryMatches: any[];
  knnMatches: any[];
}

export function createQuery(fields: IndexFields, fieldDescriptors: IndicesQuerySourceFields) {
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
            return {
              field: denseVectorField.field,
              k: 10,
              num_candidates: 100,
              query_vector_builder: {
                text_embedding: {
                  model_id: denseVectorField.model_id,
                  model_text: '{query}',
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

  return {
    ...(boolMatches.queryMatches.length > 0
      ? {
          query: {
            bool: {
              should: boolMatches.queryMatches,
              minimum_should_match: 1,
            },
          },
        }
      : {}),
    ...(boolMatches.knnMatches.length > 0 ? { knn: boolMatches.knnMatches } : {}),
  };
}

export function getDefaultSourceFields(fieldDescriptors: IndicesQuerySourceFields): IndexFields {
  const indexFields = Object.keys(fieldDescriptors).reduce<IndexFields>(
    (acc: IndexFields, index: string) => {
      const indexFieldDescriptors = fieldDescriptors[index];

      const suggested = indexFieldDescriptors.source_fields.filter((x) =>
        SUGGESTED_SOURCE_FIELDS.includes(x)
      );

      return {
        ...acc,
        [index]: suggested,
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
