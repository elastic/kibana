/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// NOTE: This is copy-pasted from es_6_0/ingest.js in OSS Console.
const commonPipelineParams = {
  on_failure: [],
  ignore_failure: {
    __one_of: [false, true],
  },
  if: '',
  tag: '',
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/enrich-processor.html
const enrichProcessorDefinition = {
  enrich: {
    __template: {
      policy_name: '',
      field: '',
      target_field: '',
    },
    policy_name: '',
    field: '',
    target_field: '',
    ignore_missing: {
      __one_of: [false, true],
    },
    override: {
      __one_of: [true, false],
    },
    max_matches: 1,
    shape_relation: 'INTERSECTS',
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/inference-processor.html
const inferenceProcessorDefinition = {
  inference: {
    __template: {
      model_id: '',
      inference_config: {},
      field_mappings: {},
    },
    target_field: '',
    model_id: '',
    field_mappings: {
      __template: {},
    },
    inference_config: {
      regression: {
        __template: {},
        results_field: '',
      },
      classification: {
        __template: {},
        results_field: '',
        num_top_classes: 2,
        top_classes_results_field: '',
      },
    },
    ...commonPipelineParams,
  },
};

export const processors = [enrichProcessorDefinition, inferenceProcessorDefinition];
