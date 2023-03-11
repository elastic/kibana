/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IngestRemoveProcessor,
  IngestSetProcessor,
  MlTrainedModelConfig,
  MlTrainedModelStats,
} from '@elastic/elasticsearch/lib/api/types';
import { BUILT_IN_MODEL_TAG } from '@kbn/ml-plugin/common/constants/data_frame_analytics';
import { SUPPORTED_PYTORCH_TASKS } from '@kbn/ml-plugin/common/constants/trained_models';

import { MlInferencePipeline, TrainedModelState } from '../types/pipelines';

import {
  BUILT_IN_MODEL_TAG as LOCAL_BUILT_IN_MODEL_TAG,
  generateMlInferencePipelineBody,
  getMlModelTypesForModelConfig,
  getRemoveProcessorForInferenceType,
  getSetProcessorForInferenceType,
  parseMlInferenceParametersFromPipeline,
  parseModelStateFromStats,
  parseModelStateReasonFromStats,
  SUPPORTED_PYTORCH_TASKS as LOCAL_SUPPORTED_PYTORCH_TASKS,
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

  it('local BUILT_IN_MODEL_TAG matches ml plugin', () => {
    expect(LOCAL_BUILT_IN_MODEL_TAG).toEqual(BUILT_IN_MODEL_TAG);
  });
});

describe('getRemoveProcessorForInferenceType lib function', () => {
  const destinationField = 'dest';

  it('should return expected value for TEXT_CLASSIFICATION', () => {
    const inferenceType = SUPPORTED_PYTORCH_TASKS.TEXT_CLASSIFICATION;

    const expected: IngestRemoveProcessor = {
      field: destinationField,
      ignore_missing: true,
    };

    expect(getRemoveProcessorForInferenceType(destinationField, inferenceType)).toEqual(expected);
  });

  it('should return expected value for TEXT_EMBEDDING', () => {
    const inferenceType = SUPPORTED_PYTORCH_TASKS.TEXT_EMBEDDING;

    const expected: IngestRemoveProcessor = {
      field: destinationField,
      ignore_missing: true,
    };

    expect(getRemoveProcessorForInferenceType(destinationField, inferenceType)).toEqual(expected);
  });

  it('should return undefined for unknown inferenceType', () => {
    const inferenceType = 'wrongInferenceType';

    expect(getRemoveProcessorForInferenceType(destinationField, inferenceType)).toBeUndefined();
  });
});

describe('getSetProcessorForInferenceType lib function', () => {
  const destinationField = 'dest';

  it('local LOCAL_SUPPORTED_PYTORCH_TASKS matches ml plugin', () => {
    expect(SUPPORTED_PYTORCH_TASKS).toEqual(LOCAL_SUPPORTED_PYTORCH_TASKS);
  });

  it('should return expected value for TEXT_CLASSIFICATION', () => {
    const inferenceType = SUPPORTED_PYTORCH_TASKS.TEXT_CLASSIFICATION;

    const expected: IngestSetProcessor = {
      copy_from: 'ml.inference.dest.predicted_value',
      description:
        "Copy the predicted_value to 'dest' if the prediction_probability is greater than 0.5",
      field: destinationField,
      if: "ctx?.ml?.inference != null && ctx.ml.inference['dest'] != null && ctx.ml.inference['dest'].prediction_probability > 0.5",
      value: undefined,
    };

    expect(getSetProcessorForInferenceType(destinationField, inferenceType)).toEqual(expected);
  });

  it('should return expected value for TEXT_EMBEDDING', () => {
    const inferenceType = SUPPORTED_PYTORCH_TASKS.TEXT_EMBEDDING;

    const expected: IngestSetProcessor = {
      copy_from: 'ml.inference.dest.predicted_value',
      description: "Copy the predicted_value to 'dest'",
      field: destinationField,
      if: "ctx?.ml?.inference != null && ctx.ml.inference['dest'] != null",
      value: undefined,
    };

    expect(getSetProcessorForInferenceType(destinationField, inferenceType)).toEqual(expected);
  });

  it('should return undefined for unknown inferenceType', () => {
    const inferenceType = 'wrongInferenceType';

    expect(getSetProcessorForInferenceType(destinationField, inferenceType)).toBeUndefined();
  });
});

describe('generateMlInferencePipelineBody lib function', () => {
  const expected: MlInferencePipeline = {
    description: 'my-description',
    processors: [
      {
        remove: {
          field: 'ml.inference.my-destination-field',
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
                value: [
                  {
                    message:
                      "Processor 'inference' in pipeline 'my-pipeline' failed with message '{{ _ingest.on_failure_message }}'",
                    pipeline: 'my-pipeline',
                    timestamp: '{{{ _ingest.timestamp }}}',
                  },
                ],
              },
            },
          ],
          target_field: 'ml.inference.my-destination-field',
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
      destinationField: 'my-destination-field',
      model: mockModel,
      pipelineName: 'my-pipeline',
      sourceField: 'my-source-field',
    });

    expect(actual).toEqual(expected);
  });

  it('should return something expected 2', () => {
    const mockTextClassificationModel: MlTrainedModelConfig = {
      ...mockModel,
      ...{ inference_config: { text_classification: {} } },
    };
    const actual: MlInferencePipeline = generateMlInferencePipelineBody({
      description: 'my-description',
      destinationField: 'my-destination-field',
      model: mockTextClassificationModel,
      pipelineName: 'my-pipeline',
      sourceField: 'my-source-field',
    });

    expect(actual).toEqual(
      expect.objectContaining({
        description: expect.any(String),
        processors: expect.arrayContaining([
          expect.objectContaining({
            remove: {
              field: 'my-destination-field',
              ignore_missing: true,
            },
          }),
          expect.objectContaining({
            set: {
              copy_from: 'ml.inference.my-destination-field.predicted_value',
              description:
                "Copy the predicted_value to 'my-destination-field' if the prediction_probability is greater than 0.5",
              field: 'my-destination-field',
              if: "ctx?.ml?.inference != null && ctx.ml.inference['my-destination-field'] != null && ctx.ml.inference['my-destination-field'].prediction_probability > 0.5",
            },
          }),
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
      destination_field: 'test',
      model_id: 'test-model',
      pipeline_name: 'unit-test',
      source_field: 'body',
    });
  });
  it('return null if pipeline missing inference processor', () => {
    expect(parseMlInferenceParametersFromPipeline('unit-test', { processors: [] })).toBeNull();
  });
  it('return null if pipeline missing field_map', () => {
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
