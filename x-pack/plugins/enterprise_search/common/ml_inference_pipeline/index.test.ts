/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlTrainedModelConfig, MlTrainedModelStats } from '@elastic/elasticsearch/lib/api/types';
import { BUILT_IN_MODEL_TAG } from '@kbn/ml-trained-models-utils';

import { MlInferencePipeline, TrainedModelState } from '../types/pipelines';

import {
  generateMlInferencePipelineBody,
  getMlModelTypesForModelConfig,
  parseMlInferenceParametersFromPipeline,
  parseModelStateFromStats,
  parseModelStateReasonFromStats,
} from '.';

const mockModel: MlTrainedModelConfig = {
  inference_config: {
    ner: {},
  },
  input: {
    field_names: [],
  },
  model_id: 'test_id',
  model_type: 'pytorch',
  tags: ['test_tag'],
  version: '1',
};

describe('getMlModelTypesForModelConfig lib function', () => {
  const builtInMockModel: MlTrainedModelConfig = {
    inference_config: {
      text_classification: {},
    },
    input: {
      field_names: [],
    },
    model_id: 'test_id',
    model_type: 'lang_ident',
    tags: [BUILT_IN_MODEL_TAG],
  };

  it('should return the model type and inference config type', () => {
    const expected = ['pytorch', 'ner'];
    const response = getMlModelTypesForModelConfig(mockModel);
    expect(response.sort()).toEqual(expected.sort());
  });

  it('should include the built in type', () => {
    const expected = ['lang_ident', 'text_classification', BUILT_IN_MODEL_TAG];
    const response = getMlModelTypesForModelConfig(builtInMockModel);
    expect(response.sort()).toEqual(expected.sort());
  });
});

describe('generateMlInferencePipelineBody lib function', () => {
  const expected: MlInferencePipeline = {
    description: 'my-description',
    processors: [
      {
        remove: {
          field: 'my-target-field',
          ignore_missing: true,
        },
      },
      {
        inference: {
          field_map: {
            'my-source-field': 'MODEL_INPUT_FIELD',
          },
          model_id: 'test_id',
          on_failure: [
            {
              append: {
                field: '_source._ingest.inference_errors',
                allow_duplicates: false,
                value: [
                  {
                    message:
                      "Processor 'inference' in pipeline 'my-pipeline' failed for field 'my-source-field' with message '{{ _ingest.on_failure_message }}'",
                    pipeline: 'my-pipeline',
                    timestamp: '{{{ _ingest.timestamp }}}',
                  },
                ],
              },
            },
          ],
          target_field: 'my-target-field',
        },
      },
      {
        append: {
          field: '_source._ingest.processors',
          value: [
            {
              model_version: '1',
              pipeline: 'my-pipeline',
              processed_timestamp: '{{{ _ingest.timestamp }}}',
              types: ['pytorch', 'ner'],
            },
          ],
        },
      },
    ],
    version: 1,
  };

  it('should return something expected', () => {
    const actual: MlInferencePipeline = generateMlInferencePipelineBody({
      description: 'my-description',
      model: mockModel,
      pipelineName: 'my-pipeline',
      fieldMappings: [{ sourceField: 'my-source-field', targetField: 'my-target-field' }],
    });

    expect(actual).toEqual(expected);
  });

  it('should return something expected with multiple fields', () => {
    const actual: MlInferencePipeline = generateMlInferencePipelineBody({
      description: 'my-description',
      model: mockModel,
      pipelineName: 'my-pipeline',
      fieldMappings: [
        { sourceField: 'my-source-field1', targetField: 'my-target-field1' },
        { sourceField: 'my-source-field2', targetField: 'my-target-field2' },
        { sourceField: 'my-source-field3', targetField: 'my-target-field3' },
      ],
    });

    expect(actual).toEqual(
      expect.objectContaining({
        processors: expect.arrayContaining([
          {
            remove: expect.objectContaining({
              field: 'my-target-field1',
            }),
          },
          {
            remove: expect.objectContaining({
              field: 'my-target-field2',
            }),
          },
          {
            remove: expect.objectContaining({
              field: 'my-target-field3',
            }),
          },
          {
            inference: expect.objectContaining({
              field_map: {
                'my-source-field1': 'MODEL_INPUT_FIELD',
              },
            }),
          },
          {
            inference: expect.objectContaining({
              field_map: {
                'my-source-field2': 'MODEL_INPUT_FIELD',
              },
            }),
          },
          {
            inference: expect.objectContaining({
              field_map: {
                'my-source-field3': 'MODEL_INPUT_FIELD',
              },
            }),
          },
        ]),
      })
    );
  });
});

describe('parseMlInferenceParametersFromPipeline', () => {
  it('returns pipeline parameters from ingest pipeline', () => {
    expect(
      parseMlInferenceParametersFromPipeline('unit-test', {
        processors: [
          {
            inference: {
              field_map: {
                body: 'text_field',
              },
              model_id: 'test-model',
              target_field: 'ml.inference.test',
            },
          },
        ],
      })
    ).toEqual({
      model_id: 'test-model',
      pipeline_name: 'unit-test',
      pipeline_definition: {},
      field_mappings: [
        {
          sourceField: 'body',
          targetField: 'ml.inference.test',
        },
      ],
    });
  });
  it('returns pipeline parameters from ingest pipeline with multiple inference processors', () => {
    expect(
      parseMlInferenceParametersFromPipeline('unit-test', {
        processors: [
          {
            inference: {
              field_map: {
                body: 'text_field',
              },
              model_id: 'test-model',
              target_field: 'ml.inference.body',
            },
          },
          {
            inference: {
              field_map: {
                title: 'text_field',
              },
              model_id: 'test-model',
              target_field: 'ml.inference.title',
            },
          },
        ],
      })
    ).toEqual({
      model_id: 'test-model',
      pipeline_name: 'unit-test',
      pipeline_definition: {},
      field_mappings: [
        {
          sourceField: 'body',
          targetField: 'ml.inference.body',
        },
        {
          sourceField: 'title',
          targetField: 'ml.inference.title',
        },
      ],
    });
  });
  it('return null if pipeline is missing inference processor', () => {
    expect(parseMlInferenceParametersFromPipeline('unit-test', { processors: [] })).toBeNull();
  });
  it('return null if pipeline is missing field_map', () => {
    expect(
      parseMlInferenceParametersFromPipeline('unit-test', {
        processors: [
          {
            inference: {
              model_id: 'test-model',
              target_field: 'test',
            },
          },
        ],
      })
    ).toBeNull();
  });
});

describe('parseModelStateFromStats', () => {
  it('returns not deployed for undefined stats', () => {
    expect(parseModelStateFromStats()).toEqual(TrainedModelState.NotDeployed);
  });
  it('returns Started', () => {
    expect(
      parseModelStateFromStats({
        deployment_stats: {
          state: 'started',
        },
      } as unknown as MlTrainedModelStats)
    ).toEqual(TrainedModelState.Started);
  });
  it('returns Starting', () => {
    expect(
      parseModelStateFromStats({
        deployment_stats: {
          state: 'starting',
        },
      } as unknown as MlTrainedModelStats)
    ).toEqual(TrainedModelState.Starting);
  });
  it('returns Stopping', () => {
    expect(
      parseModelStateFromStats({
        deployment_stats: {
          state: 'stopping',
        },
      } as unknown as MlTrainedModelStats)
    ).toEqual(TrainedModelState.Stopping);
  });
  it('returns Failed', () => {
    expect(
      parseModelStateFromStats({
        deployment_stats: {
          state: 'failed',
        },
      } as unknown as MlTrainedModelStats)
    ).toEqual(TrainedModelState.Failed);
  });
  it('returns not deployed if an unknown state is received', () => {
    expect(
      parseModelStateFromStats({
        deployment_stats: {
          state: 'other thing',
        },
      } as unknown as MlTrainedModelStats)
    ).toEqual(TrainedModelState.NotDeployed);
  });
});

describe('parseModelStateReasonFromStats', () => {
  it('returns reason from deployment_stats', () => {
    const reason = 'This is the reason the model is in a failed state';
    expect(
      parseModelStateReasonFromStats({
        deployment_stats: {
          reason,
          state: 'failed',
        },
      } as unknown as MlTrainedModelStats)
    ).toEqual(reason);
  });
  it('returns undefined if reason not found from deployment_stats', () => {
    expect(
      parseModelStateReasonFromStats({
        deployment_stats: {
          state: 'failed',
        },
      } as unknown as MlTrainedModelStats)
    ).toBeUndefined();
  });
  it('returns undefined stats is undefined', () => {
    expect(parseModelStateReasonFromStats(undefined)).toBeUndefined();
  });
});
