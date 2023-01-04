/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../../__mocks__/kea_logic';
import { nerModel } from '../../../../__mocks__/ml_models.mock';

import { HttpResponse } from '@kbn/core/public';

import { ErrorResponse } from '../../../../../../../common/types/api';
import { TrainedModelState } from '../../../../../../../common/types/pipelines';

import { GetDocumentsApiLogic } from '../../../../api/documents/get_document_logic';
import { MappingsApiLogic } from '../../../../api/mappings/mappings_logic';
import { MLModelsApiLogic } from '../../../../api/ml_models/ml_models_logic';
import { AttachMlInferencePipelineApiLogic } from '../../../../api/pipelines/attach_ml_inference_pipeline';
import { CreateMlInferencePipelineApiLogic } from '../../../../api/pipelines/create_ml_inference_pipeline';
import { FetchMlInferencePipelineProcessorsApiLogic } from '../../../../api/pipelines/fetch_ml_inference_pipeline_processors';
import { FetchMlInferencePipelinesApiLogic } from '../../../../api/pipelines/fetch_ml_inference_pipelines';
import { SimulateExistingMlInterfacePipelineApiLogic } from '../../../../api/pipelines/simulate_existing_ml_inference_pipeline';
import { SimulateMlInterfacePipelineApiLogic } from '../../../../api/pipelines/simulate_ml_inference_pipeline_processors';

import {
  MLInferenceLogic,
  EMPTY_PIPELINE_CONFIGURATION,
  MLInferenceProcessorsValues,
} from './ml_inference_logic';
import { AddInferencePipelineSteps } from './types';

const DEFAULT_VALUES: MLInferenceProcessorsValues = {
  addInferencePipelineModal: {
    configuration: {
      ...EMPTY_PIPELINE_CONFIGURATION,
    },
    indexName: '',
    step: AddInferencePipelineSteps.Configuration,
  },
  createErrors: [],
  existingInferencePipelines: [],
  formErrors: {
    modelID: 'Field is required.',
    pipelineName: 'Field is required.',
    sourceField: 'Field is required.',
  },
  index: null,
  isLoading: true,
  isPipelineDataValid: false,
  mappingData: undefined,
  mappingStatus: 0,
  mlInferencePipeline: undefined,
  mlInferencePipelineProcessors: undefined,
  mlInferencePipelinesData: undefined,
  mlModelsData: null,
  mlModelsStatus: 0,
  selectedMLModel: null,
  sourceFields: undefined,
  supportedMLModels: [],
};

describe('MlInferenceLogic', () => {
  const { mount } = new LogicMounter(MLInferenceLogic);
  const { mount: mountMappingApiLogic } = new LogicMounter(MappingsApiLogic);
  const { mount: mountMLModelsApiLogic } = new LogicMounter(MLModelsApiLogic);
  const { mount: mountSimulateExistingMlInterfacePipelineApiLogic } = new LogicMounter(
    SimulateExistingMlInterfacePipelineApiLogic
  );
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
  const { mount: mountGetDocumentsApiLogic } = new LogicMounter(GetDocumentsApiLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    mountMappingApiLogic();
    mountMLModelsApiLogic();
    mountFetchMlInferencePipelineProcessorsApiLogic();
    mountFetchMlInferencePipelinesApiLogic();
    mountSimulateExistingMlInterfacePipelineApiLogic();
    mountSimulateMlInterfacePipelineApiLogic();
    mountCreateMlInferencePipelineApiLogic();
    mountAttachMlInferencePipelineApiLogic();
    mountGetDocumentsApiLogic();
    mount();
  });

  it('has expected default values', () => {
    expect(MLInferenceLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
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
          modelId: 'test-model',
          pipelineName: 'unit-test',
          sourceField: 'body',
        });
        expect(MLInferenceLogic.values.createErrors).toHaveLength(0);
      });
    });
  });

  describe('selectors', () => {
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
            modelId: 'test-model',
            modelType: '',
            pipelineName: 'unit-test',
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
            modelId: 'test-model',
            modelType: '',
            pipelineName: 'unit-test',
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
        MLModelsApiLogic.actions.apiSuccess([nerModel]);
        MLInferenceLogic.actions.setInferencePipelineConfiguration({
          destinationField: '',
          modelID: nerModel.model_id,
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
