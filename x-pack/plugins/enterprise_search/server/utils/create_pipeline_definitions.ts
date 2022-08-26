/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/target/types/server';

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
export function createIndexPipelineDefinitions(indexName: string, esClient: ElasticsearchClient) {
  // TODO: check responses from ES
  // TODO: add back descriptions
  esClient.ingest.putPipeline({
    id: `${indexName}@ml-inference`,
    version: 1,
    description: `Enterprise Search Machine Learning Inference pipeline for ${indexName}`,
    processors: [],
  });
  esClient.ingest.putPipeline({
    id: `${indexName}@custom`,
    version: 1,
    description: `Enterprise Search custom ingest pipeline for ${indexName}`,
    processors: [],
  });
  esClient.ingest.putPipeline({
    id: `${indexName}`,
    version: 1,
    description: 'Enterprise Search ingest pipeline for <index name>',
    _meta: {
      managed_by: 'Enterprise Search',
      managed: true,
    },
    processors: [
      {
        attachment: {
          // description: 'Extract text from binary attachments',
          field: '_attachment',
          target_field: '_extracted_attachment',
          ignore_missing: true,
          indexed_chars_field: '_attachment_indexed_chars',
          if: 'ctx?._extract_binary_content == true',
          on_failure: [
            {
              append: {
                // description: 'Record error information',
                field: '_ingestion_errors',
                value: [
                  [
                    "Processor 'attachment' in pipeline '{{ _ingest.on_failure_pipeline }}' failed with message '{{ _ingest.on_failure_message }}'",
                  ],
                ],
              },
            },
          ],
        },
      },
      {
        set: {
          tag: 'set_body',
          // description: "Set any extracted text on the 'body' field",
          field: 'body',
          value: '{{{_extracted_attachment.content}}}',
          // ignore_empty_value: true,
          if: 'ctx?._extract_binary_content == true',
          on_failure: [
            {
              append: {
                // description: 'Record error information',
                field: '_ingestion_errors',
                value: [
                  [
                    "Processor 'set' with tag 'set_body' in pipeline '{{ _ingest.on_failure_pipeline }}' failed with message '{{ _ingest.on_failure_message }}'",
                  ],
                ],
              },
            },
          ],
        },
      },
      {
        pipeline: {
          tag: 'index_ml_inference_pipeline',
          // description: 'Run an inner pipeline for Machine Learning Inference',
          name: `${indexName}@ml-inference`,
          if: 'ctx?._run_ml_inference == true',
          on_failure: [
            {
              append: {
                // description: 'Record error information',
                field: '_ingestion_errors',
                value: [
                  "Processor 'pipeline' with tag 'index_ml_inference_pipeline' in pipeline '{{ _ingest.on_failure_pipeline }}' failed with message '{{ _ingest.on_failure_message }}'",
                ],
              },
            },
          ],
        },
      },
      {
        pipeline: {
          tag: 'index_custom_pipeline',
          // description: 'Run a custom inner pipeline',
          name: `${indexName}@custom`,
          on_failure: [
            {
              append: {
                // description: 'Record error information',
                field: '_ingestion_errors',
                value: [
                  "Processor 'pipeline' with tag 'index_custom_pipeline' in pipeline '{{ _ingest.on_failure_pipeline }}' failed with message '{{ _ingest.on_failure_message }}'",
                ],
              },
            },
          ],
        },
      },
      {
        gsub: {
          tag: 'remove_replacement_chars',
          // description: "Remove unicode 'replacement' characters",
          field: 'body',
          pattern: '�',
          replacement: '',
          ignore_missing: true,
          if: 'ctx?._extract_binary_content == true',
          on_failure: [
            {
              append: {
                // description: 'Record error information',
                field: '_ingestion_errors',
                value: [
                  "Processor 'gsub' with tag 'remove_replacement_chars' in pipeline '{{ _ingest.on_failure_pipeline }}' failed with message '{{ _ingest.on_failure_message }}'",
                ],
              },
            },
          ],
        },
      },
      {
        remove: {
          tag: 'remove_attachment_fields',
          // description: 'Remove meta fields related to binary content extraction',
          field: [
            '_attachment',
            '_attachment_indexed_chars',
            '_extracted_attachment',
            '_extract_binary_content',
          ],
          ignore_missing: true,
          if: 'ctx?._extract_binary_content == true',
          on_failure: [
            {
              append: {
                // description: 'Record error information',
                field: '_ingestion_errors',
                value: [
                  "Processor 'remove' with tag 'remove_attachment_fields' in pipeline '{{ _ingest.on_failure_pipeline }}' failed with message '{{ _ingest.on_failure_message }}'",
                ],
              },
            },
          ],
        },
      },
      {
        gsub: {
          tag: 'remove_extra_whitespace',
          // description: 'Squish whitespace',
          field: 'body',
          pattern: '\\s+',
          replacement: ' ',
          ignore_missing: true,
          if: 'ctx?._reduce_whitespace == true',
          on_failure: [
            {
              append: {
                // description: 'Record error information',
                field: '_ingestion_errors',
                value: [
                  "Processor 'gsub' with tag 'remove_extra_whitespace' in pipeline '{{ _ingest.on_failure_pipeline }}' failed with message '{{ _ingest.on_failure_message }}'",
                ],
              },
            },
          ],
        },
      },
      {
        trim: {
          // description: 'Trim leading and trailing whitespace',
          field: 'body',
          ignore_missing: true,
          if: 'ctx?._reduce_whitespace == true',
          on_failure: [
            {
              append: {
                // description: 'Record error information',
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
          tag: 'remove_whitespace_fields',
          // description: 'Remove meta fields related to whitespace reduction',
          field: ['_reduce_whitespace'],
          ignore_missing: true,
          if: 'ctx?._reduce_whitespace == true',
          on_failure: [
            {
              append: {
                // description: 'Record error information',
                field: '_ingestion_errors',
                value: [
                  "Processor 'remove' with tag 'remove_whitespace_fields' in pipeline '{{ _ingest.on_failure_pipeline }}' failed with message '{{ _ingest.on_failure_message }}'",
                ],
              },
            },
          ],
        },
      },
    ],
  });
  return { created: [indexName, `${indexName}@custom`, `${indexName}@ml-inference`] };
}
