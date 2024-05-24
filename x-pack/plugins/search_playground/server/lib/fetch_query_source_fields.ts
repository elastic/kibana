/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchResponse, FieldCapsResponse } from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { IndicesQuerySourceFields } from '../types';

interface FieldModelId {
  field: string;
  modelId: string | undefined;
}

interface IndexFieldModel {
  index: string;
  fields: FieldModelId[];
}

export const getModelIdFields = (fieldCapsResponse: FieldCapsResponse) => {
  const { fields } = fieldCapsResponse;
  return Object.keys(fields).reduce<Array<{ path: string; aggField: string }>>((acc, fieldKey) => {
    const field = fields[fieldKey];
    if (fieldKey.endsWith('model_id')) {
      if ('keyword' in field && field.keyword.aggregatable) {
        acc.push({
          path: fieldKey,
          aggField: fieldKey,
        });
        return acc;
      }
      const keywordModelIdField = fields[fieldKey + '.keyword'];

      if (
        keywordModelIdField &&
        `keyword` in keywordModelIdField &&
        keywordModelIdField.keyword.aggregatable
      ) {
        acc.push({
          path: fieldKey,
          aggField: fieldKey + '.keyword',
        });
        return acc;
      }
    }

    return acc;
  }, []);
};

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

  const modelIdFields = getModelIdFields(fieldCapabilities);

  const indicesAggs = await Promise.all(
    indices.map(async (index) => ({
      index,
      doc: await client.asCurrentUser.search({
        index,
        body: {
          size: 0,
          aggs: modelIdFields.reduce(
            (sum, modelIdField) => ({
              ...sum,
              [modelIdField.path]: {
                terms: {
                  field: modelIdField.aggField,
                  size: 1,
                },
              },
            }),
            {}
          ),
        },
      }),
    }))
  );

  return parseFieldsCapabilities(fieldCapabilities, indicesAggs);
};

const INFERENCE_MODEL_FIELD_REGEXP = /\.predicted_value|\.tokens/;

const getModelField = (field: string, modelIdFields: FieldModelId[]) => {
  // For input_output inferred fields, the model_id is at the top level
  const topLevelModelField = modelIdFields.find(
    (modelIdField) => modelIdField.field === 'model_id'
  )?.modelId;

  if (topLevelModelField) {
    return topLevelModelField;
  }

  return modelIdFields.find(
    (modelIdField) =>
      modelIdField.field === field.replace(INFERENCE_MODEL_FIELD_REGEXP, '.model_id')
  )?.modelId;
};

const isFieldNested = (field: string, fieldCapsResponse: FieldCapsResponse) => {
  const parts = field.split('.');
  const parents: string[] = [];
  const { fields } = fieldCapsResponse;

  // Iteratively construct parent strings
  for (let i = parts.length - 1; i >= 1; i--) {
    parents.push(parts.slice(0, i).join('.'));
  }

  // Check if any of the parents are nested
  for (const parent of parents) {
    if (fields[parent] && fields[parent].nested && fields[parent].nested.type === 'nested') {
      return parent;
    }
  }
  return false;
};

export const parseFieldsCapabilities = (
  fieldCapsResponse: FieldCapsResponse,
  aggDocs: Array<{ index: string; doc: SearchResponse }>
): IndicesQuerySourceFields => {
  const { fields, indices: indexOrIndices } = fieldCapsResponse;
  const indices = Array.isArray(indexOrIndices) ? indexOrIndices : [indexOrIndices];

  const indexModelIdFields = aggDocs.map<IndexFieldModel>((aggDoc) => {
    const modelIdFields = Object.keys(aggDoc.doc.aggregations || {}).map<FieldModelId>((field) => {
      return {
        field,
        modelId: (aggDoc.doc.aggregations![field] as any)?.buckets?.[0]?.key,
      };
    });

    return {
      index: aggDoc.index,
      fields: modelIdFields,
    };
  });

  const indicesFieldsMap = indices.reduce<IndicesQuerySourceFields>((acc, index) => {
    acc[index] = {
      elser_query_fields: [],
      dense_vector_query_fields: [],
      bm25_query_fields: [],
      source_fields: [],
      skipped_fields: 0,
    };
    return acc;
  }, {});

  // metadata fields that are ignored
  const shouldIgnoreField = (field: string) => {
    return !field.endsWith('model_id');
  };

  const querySourceFields = Object.keys(fields).reduce<IndicesQuerySourceFields>(
    (acc: IndicesQuerySourceFields, fieldKey) => {
      const field = fields[fieldKey];
      // if the field is present in all indices, the indices property is not present
      const indicesPresentIn: string[] =
        'unmapped' in field
          ? indices.filter((index) => !field.unmapped.indices!.includes(index))
          : (indices as unknown as string[]);

      for (const index of indicesPresentIn) {
        const modelIdFields = indexModelIdFields.find(
          (indexModelIdField) => indexModelIdField.index === index
        )!.fields;

        if ('rank_features' in field || 'sparse_vector' in field) {
          const nestedField = isFieldNested(fieldKey, fieldCapsResponse);
          const modelId = getModelField(fieldKey, modelIdFields);

          // Check if the sparse vector field has a model_id associated with it
          // skip this field if has no model associated with it
          // and the vectors were embedded outside of stack
          if (modelId && !nestedField) {
            const elserModelField = {
              field: fieldKey,
              model_id: modelId,
              nested: !!isFieldNested(fieldKey, fieldCapsResponse),
              indices: indicesPresentIn,
            };
            acc[index].elser_query_fields.push(elserModelField);
          } else {
            acc[index].skipped_fields++;
          }
        } else if ('dense_vector' in field) {
          const nestedField = isFieldNested(fieldKey, fieldCapsResponse);
          const modelId = getModelField(fieldKey, modelIdFields);

          // Check if the dense vector field has a model_id associated with it
          // skip this field if has no model associated with it
          // and the vectors were embedded outside of stack
          if (modelId && !nestedField) {
            const denseVectorField = {
              field: fieldKey,
              model_id: modelId,
              nested: !!nestedField,
              indices: indicesPresentIn,
            };
            acc[index].dense_vector_query_fields.push(denseVectorField);
          } else {
            acc[index].skipped_fields++;
          }
        } else if ('text' in field && field.text.searchable && shouldIgnoreField(fieldKey)) {
          acc[index].bm25_query_fields.push(fieldKey);
          acc[index].source_fields.push(fieldKey);
        } else {
          if (fieldKey !== '_id' && fieldKey !== '_index' && fieldKey !== '_type') {
            acc[index].skipped_fields++;
          }
        }
      }

      return acc;
    },
    indicesFieldsMap
  );

  return querySourceFields;
};
