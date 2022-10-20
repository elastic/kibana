/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../../__mocks__/kea_logic';

import { HttpError, Status } from '../../../../../../../common/types/api';

import { MappingsApiLogic } from '../../../../api/mappings/mappings_logic';
import { CreateMlInferencePipelineApiLogic } from '../../../../api/ml_models/create_ml_inference_pipeline';
import { MLModelsApiLogic } from '../../../../api/ml_models/ml_models_logic';
import { SimulateMlInterfacePipelineApiLogic } from '../../../../api/pipelines/simulate_ml_inference_pipeline_processors';

import {
  MLInferenceLogic,
  EMPTY_PIPELINE_CONFIGURATION,
  AddInferencePipelineSteps,
} from './ml_inference_logic';

const DEFAULT_VALUES = {
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
  mlModelsData: undefined,
  mlModelsStatus: 0,
  simulatePipelineData: undefined,
  simulatePipelineErrors: [],
  simulatePipelineResult: undefined,
  simulatePipelineStatus: 0,
  sourceFields: undefined,
  supportedMLModels: undefined,
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

  beforeEach(() => {
    jest.clearAllMocks();
    mountMappingApiLogic();
    mountMLModelsApiLogic();
    mountSimulateMlInterfacePipelineApiLogic();
    mountCreateMlInferencePipelineApiLogic();
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
