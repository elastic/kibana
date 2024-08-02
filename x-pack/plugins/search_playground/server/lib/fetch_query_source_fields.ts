/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SearchResponse,
  FieldCapsResponse,
  IndicesGetMappingResponse,
  FieldCapsFieldCapability,
  MappingPropertyBase,
} from '@elastic/elasticsearch/lib/api/types';

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { IndicesQuerySourceFields } from '../types';

interface FieldModelId {
  field: string;
  modelId: string | undefined;
}

type SemanticEmbeddingType = 'sparse_vector' | 'dense_vector';

interface SemanticField {
  field: string;
  inferenceId: string;
  embeddingType?: SemanticEmbeddingType;
}

interface IndexFieldModel {
  index: string;
  fields: FieldModelId[];
  semanticTextFields: SemanticField[];
}

type TaskType = 'sparse_embedding' | 'text_embedding';

interface MappingSemanticTextProperty extends MappingPropertyBase {
  type: 'semantic_text';
  inference_id: string;
  model_settings?: {
    task_type: TaskType;
  };
}

const EMBEDDING_TYPE: Record<TaskType, SemanticEmbeddingType> = {
  sparse_embedding: 'sparse_vector',
  text_embedding: 'dense_vector',
};

export const getModelIdFields = (fieldCapsResponse: FieldCapsResponse) => {
  const { fields } = fieldCapsResponse;
  return Object.keys(fields).reduce<Array<{ path: string; aggField: string }>>((acc, fieldKey) => {
    if (fieldKey.endsWith('model_id')) {
      const multiField = Object.keys(fields)
        .filter((key) => key.startsWith(fieldKey))
        .find((key) => fields[key].keyword && fields[key].keyword.aggregatable);

      if (multiField) {
        acc.push({
          path: fieldKey,
          aggField: multiField,
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

  const indicesAggsMappings = await Promise.all(
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
      mapping: await client.asCurrentUser.indices.getMapping({ index }),
    }))
  );

  return parseFieldsCapabilities(fieldCapabilities, indicesAggsMappings);
};

const INFERENCE_MODEL_FIELD_REGEXP = /\.predicted_value|\.tokens/;

const getSemanticField = (field: string, semanticFields: SemanticField[]) => {
  return semanticFields.find((sf) => sf.field === field);
};

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

const isFieldInIndex = (
  field: Record<string, FieldCapsFieldCapability>,
  fieldKey: string,
  index: string
) => {
  return (
    fieldKey in field &&
    ('indices' in field[fieldKey] ? field[fieldKey]?.indices?.includes(index) : true)
  );
};

const sortFields = (fields: FieldCapsResponse['fields']): FieldCapsResponse['fields'] => {
  const entries = Object.entries(fields);

  entries.sort((a, b) => a[0].localeCompare(b[0]));

  return Object.fromEntries(entries);
};

export const parseFieldsCapabilities = (
  fieldCapsResponse: FieldCapsResponse,
  aggMappingDocs: Array<{ index: string; doc: SearchResponse; mapping: IndicesGetMappingResponse }>
): IndicesQuerySourceFields => {
  const { indices: indexOrIndices } = fieldCapsResponse;
  const fields = sortFields(fieldCapsResponse.fields);
  const indices = Array.isArray(indexOrIndices) ? indexOrIndices : [indexOrIndices];

  const indexModelIdFields = aggMappingDocs.map<IndexFieldModel>((aggDoc) => {
    const modelIdFields = Object.keys(aggDoc.doc.aggregations || {}).map<FieldModelId>((field) => {
      return {
        field,
        modelId: (aggDoc.doc.aggregations![field] as any)?.buckets?.[0]?.key,
      };
    });

    const mappingProperties = aggDoc.mapping[aggDoc.index].mappings.properties || {};

    const semanticTextFields: SemanticField[] = Object.keys(mappingProperties || {})
      .filter(
        // @ts-ignore
        (field) => mappingProperties[field].type === 'semantic_text'
      )
      .map((field) => {
        const mapping = mappingProperties[field] as unknown as MappingSemanticTextProperty;
        return {
          field,
          inferenceId: mapping?.inference_id,
          embeddingType: mapping?.model_settings?.task_type
            ? EMBEDDING_TYPE[mapping.model_settings.task_type]
            : undefined,
        };
      });

    return {
      index: aggDoc.index,
      fields: modelIdFields,
      semanticTextFields,
    };
  });

  const indicesFieldsMap = indices.reduce<IndicesQuerySourceFields>((acc, index) => {
    acc[index] = {
      elser_query_fields: [],
      dense_vector_query_fields: [],
      bm25_query_fields: [],
      source_fields: [],
      skipped_fields: 0,
      semantic_fields: [],
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
        const { fields: modelIdFields, semanticTextFields } = indexModelIdFields.find(
          (indexModelIdField) => indexModelIdField.index === index
        )!;
        const nestedField = isFieldNested(fieldKey, fieldCapsResponse);

        if (isFieldInIndex(field, 'semantic_text', index)) {
          const semanticFieldMapping = getSemanticField(fieldKey, semanticTextFields);

          // only use this when embeddingType and inferenceId is defined
          // this requires semantic_text field to be set up correctly and ingested
          if (
            semanticFieldMapping &&
            semanticFieldMapping.embeddingType &&
            semanticFieldMapping.inferenceId &&
            !nestedField
          ) {
            const semanticField = {
              field: fieldKey,
              inferenceId: semanticFieldMapping.inferenceId,
              embeddingType: semanticFieldMapping.embeddingType,
              indices: (field.semantic_text.indices as string[]) || indicesPresentIn,
            };

            acc[index].semantic_fields.push(semanticField);
            acc[index].source_fields.push(fieldKey);
          } else {
            acc[index].skipped_fields++;
          }
        } else if (isFieldInIndex(field, 'sparse_vector', index)) {
          const modelId = getModelField(fieldKey, modelIdFields);
          const fieldCapabilities = field.sparse_vector;

          // Check if the sparse vector field has a model_id associated with it
          // skip this field if has no model associated with it
          // and the vectors were embedded outside of stack
          if (modelId && !nestedField) {
            const elserModelField = {
              field: fieldKey,
              model_id: modelId,
              indices: (fieldCapabilities.indices as string[]) || indicesPresentIn,
              // we must use sparse_vector query
              sparse_vector: true,
            };
            acc[index].elser_query_fields.push(elserModelField);
          } else {
            acc[index].skipped_fields++;
          }
        } else if (isFieldInIndex(field, 'rank_features', index)) {
          const modelId = getModelField(fieldKey, modelIdFields);
          const fieldCapabilities = field.rank_features;

          // Check if the sparse vector field has a model_id associated with it
          // skip this field if has no model associated with it
          // and the vectors were embedded outside of stack
          if (modelId && !nestedField) {
            const elserModelField = {
              field: fieldKey,
              model_id: modelId,
              indices: (fieldCapabilities.indices as string[]) || indicesPresentIn,
              // we must use text_expansion query
              sparse_vector: false,
            };
            acc[index].elser_query_fields.push(elserModelField);
          } else {
            acc[index].skipped_fields++;
          }
        } else if (isFieldInIndex(field, 'dense_vector', index)) {
          const modelId = getModelField(fieldKey, modelIdFields);
          const fieldCapabilities = field.dense_vector;

          // Check if the dense vector field has a model_id associated with it
          // skip this field if has no model associated with it
          // and the vectors were embedded outside of stack
          if (modelId && !nestedField) {
            const denseVectorField = {
              field: fieldKey,
              model_id: modelId,
              indices: (fieldCapabilities.indices as string[]) || indicesPresentIn,
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
