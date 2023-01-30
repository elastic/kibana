/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  MlTrainedModelDeploymentStats,
  MlTrainedModelStats,
} from '@elastic/elasticsearch/lib/api/types';
import { TrainedModelConfigResponse } from '@kbn/ml-plugin/common/types/trained_models';

export const nerModel: TrainedModelConfigResponse = {
  inference_config: {
    ner: {
      classification_labels: [
        'O',
        'B_PER',
        'I_PER',
        'B_ORG',
        'I_ORG',
        'B_LOC',
        'I_LOC',
        'B_MISC',
        'I_MISC',
      ],
      tokenization: {
        bert: {
          do_lower_case: false,
          max_sequence_length: 512,
          span: -1,
          truncate: 'first',
          with_special_tokens: true,
        },
      },
    },
  },
  input: {
    field_names: ['text_field'],
  },
  model_id: 'ner-mocked-model',
  model_type: 'pytorch',
  tags: [],
  version: '1',
};

export const textClassificationModel: TrainedModelConfigResponse = {
  inference_config: {
    text_classification: {
      classification_labels: ['anger', 'disgust', 'fear', 'joy', 'neutral', 'sadness', 'surprise'],
      num_top_classes: 0,
      tokenization: {
        roberta: {
          add_prefix_space: false,
          do_lower_case: false,
          max_sequence_length: 512,
          span: -1,
          truncate: 'first',
          with_special_tokens: true,
        },
      },
    },
  },
  input: {
    field_names: ['text_field'],
  },
  model_id: 'text-classification-mocked-model',
  model_type: 'pytorch',
  tags: [],
  version: '2',
};

export const mlModels: TrainedModelConfigResponse[] = [nerModel, textClassificationModel];

export const mlModelStats: {
  count: number;
  trained_model_stats: MlTrainedModelStats[];
} = {
  count: 2,
  trained_model_stats: [
    {
      model_id: nerModel.model_id,
      model_size_stats: {
        model_size_bytes: 260831121,
        required_native_memory_bytes: 773320482,
      },
      pipeline_count: 0,
      deployment_stats: {
        allocation_status: {
          allocation_count: 1,
          target_allocation_count: 1,
          state: 'fully_allocated',
        },
        error_count: 0,
        inference_count: 0,
        nodes: [],
        number_of_allocations: 1,
        state: 'started',
        threads_per_allocation: 1,
      } as unknown as MlTrainedModelDeploymentStats,
    },
    {
      deployment_stats: {
        allocation_status: {
          allocation_count: 1,
          target_allocation_count: 1,
          state: 'fully_allocated',
        },
        error_count: 0,
        inference_count: 0,
        nodes: [],
        number_of_allocations: 1,
        state: 'started',
        threads_per_allocation: 1,
      } as unknown as MlTrainedModelDeploymentStats,
      model_id: textClassificationModel.model_id,
      model_size_stats: {
        model_size_bytes: 260831121,
        required_native_memory_bytes: 773320482,
      },
      pipeline_count: 0,
    },
  ],
};
