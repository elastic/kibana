/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import { generateMlInferencePipelineBody } from '../../../common/ml_inference_pipeline';
import {
  InferencePipelineInferenceConfig,
  MlInferencePipeline,
} from '../../../common/types/pipelines';
import { getInferencePipelineNameFromIndexName } from '../../utils/ml_inference_pipeline_utils';

export interface CreatedPipelines {
  created: string[];
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
export const createIndexPipelineDefinitions = async (
  indexName: string,
  esClient: ElasticsearchClient
): Promise<CreatedPipelines> => {
  // TODO: add back descriptions (see: https://github.com/elastic/elasticsearch-specification/issues/1827)
  await esClient.ingest.putPipeline({
    description: `Enterprise Search Machine Learning Inference pipeline for the '${indexName}' index`,
    id: getInferencePipelineNameFromIndexName(indexName),
    processors: [],
    version: 1,
  });
  await esClient.ingest.putPipeline({
    description: `Enterprise Search customizable ingest pipeline for the '${indexName}' index`,
    id: `${indexName}@custom`,
    processors: [],
    version: 1,
  });
  await esClient.ingest.putPipeline({
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
          name: getInferencePipelineNameFromIndexName(indexName),
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
          field: [
            '_attachment',
            '_attachment_indexed_chars',
            '_extracted_attachment',
            '_extract_binary_content',
            '_reduce_whitespace',
            '_run_ml_inference',
          ],
          ignore_missing: true,
          on_failure: [
            {
              append: {
                field: '_ingestion_errors',
                value: [
                  "Processor 'remove' with tag 'remove_meta_fields' in pipeline '{{ _ingest.on_failure_pipeline }}' failed with message '{{ _ingest.on_failure_message }}'",
                ],
              },
            },
          ],
          tag: 'remove_meta_fields',
        },
      },
    ],
    version: 1,
  });
  return {
    created: [indexName, `${indexName}@custom`, getInferencePipelineNameFromIndexName(indexName)],
  };
};

/**
 * Format the body of an ML inference pipeline for a specified model.
 * Does not create the pipeline, only returns JSON for the user to preview.
 * @param modelId modelId selected by user.
 * @param sourceField The document field that model will read.
 * @param destinationField The document field that the model will write to.
 * @param inferenceConfig The configuration for the model.
 * @param esClient the Elasticsearch Client to use when retrieving model details.
 */
export const formatMlPipelineBody = async (
  pipelineName: string,
  modelId: string,
  sourceField: string,
  destinationField: string,
  inferenceConfig: InferencePipelineInferenceConfig | undefined,
  esClient: ElasticsearchClient
): Promise<MlInferencePipeline> => {
  // this will raise a 404 if model doesn't exist
  const models = await esClient.ml.getTrainedModels({ model_id: modelId });
  const model = models.trained_model_configs[0];
  return generateMlInferencePipelineBody({
    destinationField,
    inferenceConfig,
    model,
    pipelineName,
    sourceField,
  });
};
