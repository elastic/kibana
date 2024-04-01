/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldCapsResponse, SearchHit } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { get } from 'lodash';
import { IndicesQuerySourceFields } from '../types';

export const fetchFields = async (
  client: IScopedClusterClient,
  indices: string[]
): Promise<IndicesQuerySourceFields> => {
  const fieldCapabilities = await client.asCurrentUser.fieldCaps({
    fields: '*',
    filters: '-metadata',
    include_unmapped: true,
    index: indices,
  });

  const indexDocs = [];

  for (const index of indices) {
    const x = await client.asCurrentUser.search({
      index,
      body: {
        query: {
          match_all: {},
        },
        size: 1,
      },
    });

    if (x.hits.total !== 0) {
      indexDocs.push({
        index,
        doc: x.hits.hits[0],
      });
    }
  }

  return parseFieldsCapabilities(fieldCapabilities, indexDocs);
};

const getModelField = (field: string, indexDoc: any) => {
  return get(indexDoc.doc, `_source.${[field.replace('.tokens', '.model_id')]}`);
};

export const parseFieldsCapabilities = (
  fieldCapsResponse: FieldCapsResponse,
  indexDocs: Array<{ index: string; doc: SearchHit }>
): IndicesQuerySourceFields => {
  const { fields, indices: indexOrIndices } = fieldCapsResponse;
  const indices = Array.isArray(indexOrIndices) ? indexOrIndices : [indexOrIndices];

  const indicesFieldsMap = indices.reduce<IndicesQuerySourceFields>((acc, index) => {
    acc[index] = {
      elser_query_fields: [],
      dense_vector_query_fields: [],
      bm25_query_fields: [],
      source_fields: [],
    };
    return acc;
  }, {});

  const querySourceFields = Object.keys(fields).reduce<IndicesQuerySourceFields>(
    (acc: IndicesQuerySourceFields, fieldKey) => {
      const field = fields[fieldKey];
      // if the field is present in all indices, the indices property is not present
      const indicesPresentIn: string[] =
        'unmapped' in field
          ? indices.filter((index) => !field.unmapped.indices!.includes(index))
          : (indices as unknown as string[]);

      for (const index of indicesPresentIn) {
        const indexDoc = indexDocs.find((x) => x.index === index);
        if ('rank_features' in field) {
          const elserModelField = {
            field: fieldKey,
            model_id: getModelField(fieldKey, indexDoc),
            nested: false,
          };
          acc[index].elser_query_fields.push(elserModelField);
        } else if ('dense_vector' in field) {
          const denseVectorField = {
            field: fieldKey,
            model_id: getModelField(fieldKey, indexDoc),
            nested: false,
          };
          acc[index].dense_vector_query_fields.push(denseVectorField);
        } else if ('text' in field && field.text.searchable) {
          acc[index].bm25_query_fields.push(fieldKey);
          acc[index].source_fields.push(fieldKey);
        }
      }

      return acc;
    },
    indicesFieldsMap
  );

  return querySourceFields;
};
