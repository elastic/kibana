/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestPipeline } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';

export interface CreatedPipelines {
  created: string[];
}

export interface MlInferencePipeline extends IngestPipeline {
  version?: number;
}

/**
 * Used to create index-specific Ingest Pipelines to be used in conjunction with Enterprise Search
 * ingestion mechanisms. Three pipelines are created:
 * 1. `<indexName>@ml-inference` - empty by default. Any ML Inference processors that are enabled
 *   for this index are intended to be encapsulated in this pipeline.
 * 2. `<indexName>@custom` - empty by default. The customer is encouraged to edit this pipeline
 *   manually in order to meet their business needs.
 * 3. `<indexName>` - includes processors for binary content extraction, whitespace reduction, and nests
 *   the above pipelines in itself via pipeline processors.
 * @param indexName the index for which the pipelines should be created.
 * @param esClient the Elasticsearch Client with which to create the pipelines.
 */
export const createIndexPipelineDefinitions = (
  indexName: string,
  esClient: ElasticsearchClient
): CreatedPipelines => {
  // TODO: add back descriptions (see: https://github.com/elastic/elasticsearch-specification/issues/1827)
  esClient.ingest.putPipeline({
    description: `Enterprise Search Machine Learning Inference pipeline for the '${indexName}' index`,
    id: `${indexName}@ml-inference`,
    processors: [],
    version: 1,
  });
  esClient.ingest.putPipeline({
    description: `Enterprise Search customizable ingest pipeline for the '${indexName}' index`,
    id: `${indexName}@custom`,
    processors: [],
    version: 1,
  });
  esClient.ingest.putPipeline({
    _meta: {
      managed: true,
      managed_by: 'Enterprise Search',
    },
    description: `Enterprise Search ingest pipeline for the '${indexName}' index`,
    id: `${indexName}`,
    processors: [
      {
        attachment: {
          field: '_attachment',
          if: 'ctx?._extract_binary_content == true',
          ignore_missing: true,
          indexed_chars_field: '_attachment_indexed_chars',
          on_failure: [
            {
              append: {
                field: '_ingestion_errors',
                value: [
                  [
                    "Processor 'attachment' in pipeline '{{ _ingest.on_failure_pipeline }}' failed with message '{{ _ingest.on_failure_message }}'",
                  ],
                ],
              },
            },
          ],
          target_field: '_extracted_attachment',
        },
      },
      {
        set: {
          field: 'body',
          if: 'ctx?._extract_binary_content == true',
          on_failure: [
            {
              append: {
                field: '_ingestion_errors',
                value: [
                  [
                    "Processor 'set' with tag 'set_body' in pipeline '{{ _ingest.on_failure_pipeline }}' failed with message '{{ _ingest.on_failure_message }}'",
                  ],
                ],
              },
            },
          ],
          tag: 'set_body',
          value: '{{{_extracted_attachment.content}}}',
        },
      },
      {
        pipeline: {
          if: 'ctx?._run_ml_inference == true',
          name: `${indexName}@ml-inference`,
          on_failure: [
            {
              append: {
                field: '_ingestion_errors',
                value: [
                  "Processor 'pipeline' with tag 'index_ml_inference_pipeline' in pipeline '{{ _ingest.on_failure_pipeline }}' failed with message '{{ _ingest.on_failure_message }}'",
                ],
              },
            },
          ],
          tag: 'index_ml_inference_pipeline',
        },
      },
      {
        pipeline: {
          name: `${indexName}@custom`,
          on_failure: [
            {
              append: {
                field: '_ingestion_errors',
                value: [
                  "Processor 'pipeline' with tag 'index_custom_pipeline' in pipeline '{{ _ingest.on_failure_pipeline }}' failed with message '{{ _ingest.on_failure_message }}'",
                ],
              },
            },
          ],
          tag: 'index_custom_pipeline',
        },
      },
      {
        gsub: {
          field: 'body',
          if: 'ctx?._extract_binary_content == true',
          ignore_missing: true,
          on_failure: [
            {
              append: {
                field: '_ingestion_errors',
                value: [
                  "Processor 'gsub' with tag 'remove_replacement_chars' in pipeline '{{ _ingest.on_failure_pipeline }}' failed with message '{{ _ingest.on_failure_message }}'",
                ],
              },
            },
          ],
          pattern: '�',
          replacement: '',
          tag: 'remove_replacement_chars',
        },
      },
      {
        remove: {
          field: [
            '_attachment',
            '_attachment_indexed_chars',
            '_extracted_attachment',
            '_extract_binary_content',
          ],
          if: 'ctx?._extract_binary_content == true',
          ignore_missing: true,
          on_failure: [
            {
              append: {
                field: '_ingestion_errors',
                value: [
                  "Processor 'remove' with tag 'remove_attachment_fields' in pipeline '{{ _ingest.on_failure_pipeline }}' failed with message '{{ _ingest.on_failure_message }}'",
                ],
              },
            },
          ],
          tag: 'remove_attachment_fields',
        },
      },
      {
        gsub: {
          field: 'body',
          if: 'ctx?._reduce_whitespace == true',
          ignore_missing: true,
          on_failure: [
            {
              append: {
                field: '_ingestion_errors',
                value: [
                  "Processor 'gsub' with tag 'remove_extra_whitespace' in pipeline '{{ _ingest.on_failure_pipeline }}' failed with message '{{ _ingest.on_failure_message }}'",
                ],
              },
            },
          ],
          pattern: '\\s+',
          replacement: ' ',
          tag: 'remove_extra_whitespace',
        },
      },
      {
        trim: {
          field: 'body',
          if: 'ctx?._reduce_whitespace == true',
          ignore_missing: true,
          on_failure: [
            {
              append: {
                field: '_ingestion_errors',
                value: [
                  "Processor 'trim' in pipeline '{{ _ingest.on_failure_pipeline }}' failed with message '{{ _ingest.on_failure_message }}'",
                ],
              },
            },
          ],
        },
      },
      {
        remove: {
          field: ['_reduce_whitespace'],
          if: 'ctx?._reduce_whitespace == true',
          ignore_missing: true,
          on_failure: [
            {
              append: {
                field: '_ingestion_errors',
                value: [
                  "Processor 'remove' with tag 'remove_whitespace_fields' in pipeline '{{ _ingest.on_failure_pipeline }}' failed with message '{{ _ingest.on_failure_message }}'",
                ],
              },
            },
          ],
          tag: 'remove_whitespace_fields',
        },
      },
    ],
    version: 1,
  });
  return { created: [indexName, `${indexName}@custom`, `${indexName}@ml-inference`] };
};

/**
 * Format the body of an ML inference pipeline for a specified model.
 * Does not create the pipeline, only returns JSON for the user to preview.
 * @param modelId modelId selected by user.
 * @param sourceField The document field that model will read.
 * @param destinationField The document field that the model will write to.
 * @param esClient the Elasticsearch Client to use when retrieving model details.
 */
export const formatMlPipelineBody = async (
  modelId: string,
  sourceField: string,
  destinationField: string,
  esClient: ElasticsearchClient
): Promise<MlInferencePipeline> => {
  const models = await esClient.ml.getTrainedModels({ model_id: modelId });
  // if we didn't find this model, we can't return anything useful
  if (models.trained_model_configs === undefined || models.trained_model_configs.length === 0) {
    throw new Error(`Couldn't find any trained models with id [${modelId}]`);
  }
  const model = models.trained_model_configs[0];
  // if model returned no input field, insert a placeholder
  const modelInputField =
    model.input?.field_names?.length > 0 ? model.input.field_names[0] : 'MODEL_INPUT_FIELD';
  const modelType = model.model_type;
  const modelVersion = model.version;
  return {
    description: '',
    version: 1,
    processors: [
      {
        remove: {
          field: `ml.inference.${destinationField}`,
          ignore_missing: true,
        },
      },
      {
        inference: {
          model_id: modelId,
          target_field: `ml.inference.${destinationField}`,
          field_map: {
            sourceField: modelInputField,
          },
        },
      },
      {
        append: {
          field: '_source._ingest.processors',
          value: [
            {
              type: modelType,
              model_id: modelId,
              model_version: modelVersion,
              processed_timestamp: '{{{ _ingest.timestamp }}}',
            },
          ],
        },
      },
    ],
  };
};
