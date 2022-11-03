/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../../__mocks__/kea_logic';

import { HttpResponse } from '@kbn/core/public';

import { ErrorResponse, HttpError, Status } from '../../../../../../../common/types/api';
import { TrainedModelState } from '../../../../../../../common/types/pipelines';

import { MappingsApiLogic } from '../../../../api/mappings/mappings_logic';
import { MLModelsApiLogic } from '../../../../api/ml_models/ml_models_logic';
import { AttachMlInferencePipelineApiLogic } from '../../../../api/pipelines/attach_ml_inference_pipeline';
import { CreateMlInferencePipelineApiLogic } from '../../../../api/pipelines/create_ml_inference_pipeline';
import { FetchMlInferencePipelineProcessorsApiLogic } from '../../../../api/pipelines/fetch_ml_inference_pipeline_processors';
import { FetchMlInferencePipelinesApiLogic } from '../../../../api/pipelines/fetch_ml_inference_pipelines';
import { SimulateMlInterfacePipelineApiLogic } from '../../../../api/pipelines/simulate_ml_inference_pipeline_processors';

import {
  MLInferenceLogic,
  EMPTY_PIPELINE_CONFIGURATION,
  AddInferencePipelineSteps,
  MLInferenceProcessorsValues,
} from './ml_inference_logic';

const DEFAULT_VALUES: MLInferenceProcessorsValues = {
  addInferencePipelineModal: {
    configuration: {
      ...EMPTY_PIPELINE_CONFIGURATION,
    },
    indexName: '',
    simulateBody: `
[
  {
    "_index": "index",
    "_id": "id",
    "_source": {
      "foo": "bar"
    }
  },
  {
    "_index": "index",
    "_id": "id",
    "_source": {
      "foo": "baz"
    }
  }
]`,
    step: AddInferencePipelineSteps.Configuration,
  },
  createErrors: [],
  existingInferencePipelines: [],
  formErrors: {
    modelID: 'Field is required.',
    pipelineName: 'Field is required.',
    sourceField: 'Field is required.',
  },
  index: undefined,
  isLoading: true,
  isPipelineDataValid: false,
  mappingData: undefined,
  mappingStatus: 0,
  mlInferencePipeline: undefined,
  mlInferencePipelineProcessors: undefined,
  mlInferencePipelinesData: undefined,
  mlModelsData: undefined,
  mlModelsStatus: 0,
  simulateExistingPipelineData: undefined,
  simulateExistingPipelineStatus: 0,
  simulatePipelineData: undefined,
  simulatePipelineErrors: [],
  simulatePipelineResult: undefined,
  simulatePipelineStatus: 0,
  sourceFields: undefined,
  supportedMLModels: [],
};

describe('MlInferenceLogic', () => {
  const { mount } = new LogicMounter(MLInferenceLogic);
  const { mount: mountMappingApiLogic } = new LogicMounter(MappingsApiLogic);
  const { mount: mountMLModelsApiLogic } = new LogicMounter(MLModelsApiLogic);
  const { mount: mountSimulateMlInterfacePipelineApiLogic } = new LogicMounter(
    SimulateMlInterfacePipelineApiLogic
  );
  const { mount: mountCreateMlInferencePipelineApiLogic } = new LogicMounter(
    CreateMlInferencePipelineApiLogic
  );
  const { mount: mountAttachMlInferencePipelineApiLogic } = new LogicMounter(
    AttachMlInferencePipelineApiLogic
  );
  const { mount: mountFetchMlInferencePipelineProcessorsApiLogic } = new LogicMounter(
    FetchMlInferencePipelineProcessorsApiLogic
  );
  const { mount: mountFetchMlInferencePipelinesApiLogic } = new LogicMounter(
    FetchMlInferencePipelinesApiLogic
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mountMappingApiLogic();
    mountMLModelsApiLogic();
    mountFetchMlInferencePipelineProcessorsApiLogic();
    mountFetchMlInferencePipelinesApiLogic();
    mountSimulateMlInterfacePipelineApiLogic();
    mountCreateMlInferencePipelineApiLogic();
    mountAttachMlInferencePipelineApiLogic();
    mount();
  });

  it('has expected default values', () => {
    expect(MLInferenceLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('setSimulatePipelineErrors', () => {
      it('sets simulatePipelineErrors to passed payload', () => {
        expect(MLInferenceLogic.values).toEqual(DEFAULT_VALUES);

        MLInferenceLogic.actions.setSimulatePipelineErrors([
          'I would be an error coming from Backend',
          'I would be another one',
        ]);

        expect(MLInferenceLogic.values).toEqual({
          ...DEFAULT_VALUES,
          simulatePipelineErrors: [
            'I would be an error coming from Backend',
            'I would be another one',
          ],
        });
      });
    });
    describe('attachApiError', () => {
      it('updates create errors', () => {
        MLInferenceLogic.actions.attachApiError({
          body: {
            error: '',
            message: 'this is an error',
            statusCode: 500,
          },
        } as HttpResponse<ErrorResponse>);

        expect(MLInferenceLogic.values.createErrors).toEqual(['this is an error']);
      });
    });
    describe('createApiError', () => {
      it('updates create errors', () => {
        MLInferenceLogic.actions.createApiError({
          body: {
            error: '',
            message: 'this is an error',
            statusCode: 500,
          },
        } as HttpResponse<ErrorResponse>);

        expect(MLInferenceLogic.values.createErrors).toEqual(['this is an error']);
      });
    });
    describe('makeAttachPipelineRequest', () => {
      it('clears existing errors', () => {
        MLInferenceLogic.actions.attachApiError({
          body: {
            error: '',
            message: 'this is an error',
            statusCode: 500,
          },
        } as HttpResponse<ErrorResponse>);

        expect(MLInferenceLogic.values.createErrors).not.toHaveLength(0);
        MLInferenceLogic.actions.makeAttachPipelineRequest({
          indexName: 'test',
          pipelineName: 'unit-test',
        });
        expect(MLInferenceLogic.values.createErrors).toHaveLength(0);
      });
    });
    describe('makeCreatePipelineRequest', () => {
      it('clears existing errors', () => {
        MLInferenceLogic.actions.createApiError({
          body: {
            error: '',
            message: 'this is an error',
            statusCode: 500,
          },
        } as HttpResponse<ErrorResponse>);

        expect(MLInferenceLogic.values.createErrors).not.toHaveLength(0);
        MLInferenceLogic.actions.makeCreatePipelineRequest({
          indexName: 'test',
          pipelineName: 'unit-test',
          modelId: 'test-model',
          sourceField: 'body',
        });
        expect(MLInferenceLogic.values.createErrors).toHaveLength(0);
      });
    });
  });

  describe('selectors', () => {
    describe('simulatePipelineResult', () => {
      it('returns undefined if simulatePipelineStatus is not success', () => {
        SimulateMlInterfacePipelineApiLogic.actions.apiError({} as HttpError);
        expect(MLInferenceLogic.values).toEqual({
          ...DEFAULT_VALUES,
          simulatePipelineErrors: ['An unexpected error occurred'],
          simulatePipelineResult: undefined,
          simulatePipelineStatus: Status.ERROR,
        });
      });
      it('returns simulation result when API is successful', () => {
        const simulateResponse = {
          docs: [
            {
              doc: {
                _id: 'id',
                _index: 'index',
                _ingest: { timestamp: '2022-10-06T10:28:54.3326245Z' },
                _source: {
                  _ingest: {
                    inference_errors: [
                      {
                        message:
                          "Processor 'inference' in pipeline 'test' failed with message 'Input field [text_field] does not exist in the source document'",
                        pipeline: 'guy',
                        timestamp: '2022-10-06T10:28:54.332624500Z',
                      },
                    ],
                    processors: [
                      {
                        model_version: '8.6.0',
                        pipeline: 'guy',
                        processed_timestamp: '2022-10-06T10:28:54.332624500Z',
                        types: ['pytorch', 'ner'],
                      },
                    ],
                  },
                  _version: '-3',
                  foo: 'bar',
                },
              },
            },
          ],
        };
        SimulateMlInterfacePipelineApiLogic.actions.apiSuccess(simulateResponse);

        expect(MLInferenceLogic.values.simulatePipelineResult).toEqual(simulateResponse);
      });
    });
    describe('existingInferencePipelines', () => {
      beforeEach(() => {
        MappingsApiLogic.actions.apiSuccess({
          mappings: {
            properties: {
              body: {
                type: 'text',
              },
            },
          },
        });
      });
      it('returns empty list when there is not existing pipelines available', () => {
        expect(MLInferenceLogic.values.existingInferencePipelines).toEqual([]);
      });
      it('returns existing pipeline option', () => {
        FetchMlInferencePipelinesApiLogic.actions.apiSuccess({
          'unit-test': {
            processors: [
              {
                inference: {
                  field_map: {
                    body: 'text_field',
                  },
                  model_id: 'test-model',
                  target_field: 'ml.inference.test-field',
                },
              },
            ],
            version: 1,
          },
        });

        expect(MLInferenceLogic.values.existingInferencePipelines).toEqual([
          {
            destinationField: 'test-field',
            disabled: false,
            pipelineName: 'unit-test',
            modelType: '',
            modelId: 'test-model',
            sourceField: 'body',
          },
        ]);
      });
      it('returns disabled pipeline option if missing source field', () => {
        FetchMlInferencePipelinesApiLogic.actions.apiSuccess({
          'unit-test': {
            processors: [
              {
                inference: {
                  field_map: {
                    body_content: 'text_field',
                  },
                  model_id: 'test-model',
                  target_field: 'ml.inference.test-field',
                },
              },
            ],
            version: 1,
          },
        });

        expect(MLInferenceLogic.values.existingInferencePipelines).toEqual([
          {
            destinationField: 'test-field',
            disabled: true,
            disabledReason: expect.any(String),
            pipelineName: 'unit-test',
            modelType: '',
            modelId: 'test-model',
            sourceField: 'body_content',
          },
        ]);
      });
      it('returns enabled pipeline option if model is redacted', () => {
        FetchMlInferencePipelinesApiLogic.actions.apiSuccess({
          'unit-test': {
            processors: [
              {
                inference: {
                  field_map: {
                    body: 'text_field',
                  },
                  model_id: '',
                  target_field: 'ml.inference.test-field',
                },
              },
            ],
            version: 1,
          },
        });

        expect(MLInferenceLogic.values.existingInferencePipelines).toEqual([
          {
            destinationField: 'test-field',
            disabled: false,
            pipelineName: 'unit-test',
            modelType: '',
            modelId: '',
            sourceField: 'body',
          },
        ]);
      });
      it('returns disabled pipeline option if pipeline already attached', () => {
        FetchMlInferencePipelineProcessorsApiLogic.actions.apiSuccess([
          {
            modelId: 'test-model',
            modelState: TrainedModelState.Started,
            pipelineName: 'unit-test',
            pipelineReferences: ['test@ml-inference'],
            types: ['ner', 'pytorch'],
          },
        ]);
        FetchMlInferencePipelinesApiLogic.actions.apiSuccess({
          'unit-test': {
            processors: [
              {
                inference: {
                  field_map: {
                    body: 'text_field',
                  },
                  model_id: 'test-model',
                  target_field: 'ml.inference.test-field',
                },
              },
            ],
            version: 1,
          },
        });

        expect(MLInferenceLogic.values.existingInferencePipelines).toEqual([
          {
            destinationField: 'test-field',
            disabled: true,
            disabledReason: expect.any(String),
            pipelineName: 'unit-test',
            modelType: '',
            modelId: 'test-model',
            sourceField: 'body',
          },
        ]);
      });
    });
    describe('mlInferencePipeline', () => {
      it('returns undefined when configuration is invalid', () => {
        MLInferenceLogic.actions.setInferencePipelineConfiguration({
          destinationField: '',
          modelID: '',
          pipelineName: 'unit-test',
          sourceField: '',
        });

        expect(MLInferenceLogic.values.mlInferencePipeline).toBeUndefined();
      });
      it('generates inference pipeline', () => {
        MLModelsApiLogic.actions.apiSuccess([
          {
            inference_config: {
              text_classification: {
                classification_labels: ['one', 'two'],
                tokenization: {
                  bert: {},
                },
              },
            },
            input: {
              field_names: ['text_field'],
            },
            model_id: 'test-model',
            model_type: 'pytorch',
            tags: [],
            version: '1.0.0',
          },
        ]);
        MLInferenceLogic.actions.setInferencePipelineConfiguration({
          destinationField: '',
          modelID: 'test-model',
          pipelineName: 'unit-test',
          sourceField: 'body',
        });

        expect(MLInferenceLogic.values.mlInferencePipeline).not.toBeUndefined();
      });
      it('returns undefined when existing pipeline not yet selected', () => {
        MLInferenceLogic.actions.setInferencePipelineConfiguration({
          existingPipeline: true,
          destinationField: '',
          modelID: '',
          pipelineName: '',
          sourceField: '',
        });
        expect(MLInferenceLogic.values.mlInferencePipeline).toBeUndefined();
      });
      it('return existing pipeline when selected', () => {
        const existingPipeline = {
          description: 'this is a test',
          processors: [],
          version: 1,
        };
        FetchMlInferencePipelinesApiLogic.actions.apiSuccess({
          'unit-test': existingPipeline,
        });
        MLInferenceLogic.actions.setInferencePipelineConfiguration({
          existingPipeline: true,
          destinationField: '',
          modelID: '',
          pipelineName: 'unit-test',
          sourceField: '',
        });
        expect(MLInferenceLogic.values.mlInferencePipeline).not.toBeUndefined();
        expect(MLInferenceLogic.values.mlInferencePipeline).toEqual(existingPipeline);
      });
    });
  });

  describe('listeners', () => {
    describe('createPipeline', () => {
      const mockModelConfiguration = {
        ...DEFAULT_VALUES.addInferencePipelineModal,
        configuration: {
          destinationField: '',
          modelID: 'mock-model-id',
          pipelineName: 'mock-pipeline-name',
          sourceField: 'mock_text_field',
        },
        indexName: 'my-index-123',
      };
      it('calls makeCreatePipelineRequest when no destinationField is passed', () => {
        mount({
          ...DEFAULT_VALUES,
          addInferencePipelineModal: {
            ...mockModelConfiguration,
          },
        });
        jest.spyOn(MLInferenceLogic.actions, 'makeCreatePipelineRequest');
        MLInferenceLogic.actions.createPipeline();

        expect(MLInferenceLogic.actions.makeCreatePipelineRequest).toHaveBeenCalledWith({
          destinationField: undefined,
          indexName: mockModelConfiguration.indexName,
          modelId: mockModelConfiguration.configuration.modelID,
          pipelineName: mockModelConfiguration.configuration.pipelineName,
          sourceField: mockModelConfiguration.configuration.sourceField,
        });
      });

      it('calls makeCreatePipelineRequest with passed destinationField', () => {
        mount({
          ...DEFAULT_VALUES,
          addInferencePipelineModal: {
            ...mockModelConfiguration,
            configuration: {
              ...mockModelConfiguration.configuration,
              destinationField: 'mockDestinationField',
            },
          },
        });
        jest.spyOn(MLInferenceLogic.actions, 'makeCreatePipelineRequest');
        MLInferenceLogic.actions.createPipeline();

        expect(MLInferenceLogic.actions.makeCreatePipelineRequest).toHaveBeenCalledWith({
          destinationField: 'mockDestinationField',
          indexName: mockModelConfiguration.indexName,
          modelId: mockModelConfiguration.configuration.modelID,
          pipelineName: mockModelConfiguration.configuration.pipelineName,
          sourceField: mockModelConfiguration.configuration.sourceField,
        });
      });
    });
  });
});
