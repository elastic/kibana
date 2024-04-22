/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../../__mocks__/kea_logic';

import { HttpResponse } from '@kbn/core/public';

import { ErrorResponse, Status } from '../../../../../../../common/types/api';
import { MlModel, MlModelDeploymentState } from '../../../../../../../common/types/ml';

import { GetDocumentsApiLogic } from '../../../../api/documents/get_document_logic';
import { MappingsApiLogic } from '../../../../api/mappings/mappings_logic';
import { CachedFetchModelsApiLogic } from '../../../../api/ml_models/cached_fetch_models_api_logic';
import { StartTextExpansionModelApiLogic } from '../../../../api/ml_models/text_expansion/start_text_expansion_model_api_logic';
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
  existingPipeline: undefined,
  formErrors: {
    fieldMappings: 'Field is required.',
    modelID: 'Field is required.',
    pipelineName: 'Field is required.',
  },
  index: null,
  isConfigureStepValid: false,
  isLoading: true,
  isModelsInitialLoading: false,
  isPipelineDataValid: false,
  isTextExpansionModelSelected: false,
  mappingData: undefined,
  mappingStatus: 0,
  mlInferencePipeline: undefined,
  mlInferencePipelineProcessors: undefined,
  mlInferencePipelinesData: undefined,
  modelsData: undefined,
  modelsStatus: 0,
  selectableModels: [],
  selectedModel: undefined,
  sourceFields: undefined,
};

const MODELS: MlModel[] = [
  {
    modelId: 'model_1',
    type: 'ner',
    title: 'Model 1',
    description: 'Model 1 description',
    licenseType: 'elastic',
    modelDetailsPageUrl: 'https://my-model.ai',
    deploymentState: MlModelDeploymentState.NotDeployed,
    startTime: 0,
    targetAllocationCount: 0,
    nodeAllocationCount: 0,
    threadsPerAllocation: 0,
    isPlaceholder: false,
    hasStats: false,
    types: ['pytorch', 'ner'],
    inputFieldNames: ['title'],
    version: '1',
  },
];

describe('MlInferenceLogic', () => {
  const { mount } = new LogicMounter(MLInferenceLogic);
  const { mount: mountMappingApiLogic } = new LogicMounter(MappingsApiLogic);
  const { mount: mountCachedFetchModelsApiLogic } = new LogicMounter(CachedFetchModelsApiLogic);
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
  const { mount: mountStartTextExpansionModel } = new LogicMounter(StartTextExpansionModelApiLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    mountMappingApiLogic();
    mountCachedFetchModelsApiLogic();
    mountFetchMlInferencePipelineProcessorsApiLogic();
    mountFetchMlInferencePipelinesApiLogic();
    mountSimulateExistingMlInterfacePipelineApiLogic();
    mountSimulateMlInterfacePipelineApiLogic();
    mountCreateMlInferencePipelineApiLogic();
    mountAttachMlInferencePipelineApiLogic();
    mountGetDocumentsApiLogic();
    mountStartTextExpansionModel();
    mount();
  });

  it('has expected default values', () => {
    CachedFetchModelsApiLogic.actions.apiSuccess(MODELS);
    expect(MLInferenceLogic.values).toEqual({
      ...DEFAULT_VALUES,
      modelsData: MODELS, // Populated by afterMount hook
      modelsStatus: Status.SUCCESS,
      selectableModels: MODELS,
    });
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
          fieldMappings: [
            {
              sourceField: 'body',
              targetField: 'ml.inference.body',
            },
          ],
          indexName: 'test',
          modelId: 'test-model',
          pipelineDefinition: {},
          pipelineName: 'unit-test',
        });
        expect(MLInferenceLogic.values.createErrors).toHaveLength(0);
      });
    });
  });

  describe('selectors', () => {
    describe('formErrors', () => {
      it('has errors when configuration is empty', () => {
        expect(MLInferenceLogic.values.formErrors).toEqual({
          modelID: 'Field is required.',
          fieldMappings: 'Field is required.',
          pipelineName: 'Field is required.',
        });
      });
      it('has error for invalid pipeline names', () => {
        MLInferenceLogic.actions.setInferencePipelineConfiguration({
          ...MLInferenceLogic.values.addInferencePipelineModal.configuration,
          modelID: 'unit-test-model',
          existingPipeline: false,
          fieldMappings: [
            {
              sourceField: 'body',
              targetField: 'ml.inference.body',
            },
          ],
          pipelineName: 'Invalid Pipeline Name',
        });
        const expectedErrors = {
          pipelineName: 'Name must only contain letters, numbers, underscores, and hyphens.',
        };

        expect(MLInferenceLogic.values.formErrors).toEqual(expectedErrors);
        MLInferenceLogic.actions.setInferencePipelineConfiguration({
          ...MLInferenceLogic.values.addInferencePipelineModal.configuration,
          pipelineName: 'pipeline-name-$%^&',
        });
        expect(MLInferenceLogic.values.formErrors).toEqual(expectedErrors);
        MLInferenceLogic.actions.setInferencePipelineConfiguration({
          ...MLInferenceLogic.values.addInferencePipelineModal.configuration,
          pipelineName: 'pipeline-name',
        });
        expect(MLInferenceLogic.values.formErrors).toEqual({});
      });
      it('has pipelineName error when existing pipeline returned from fetch', () => {
        MLInferenceLogic.actions.setInferencePipelineConfiguration({
          ...MLInferenceLogic.values.addInferencePipelineModal.configuration,
          pipelineName: 'unit-test-pipeline',
          modelID: 'unit-test-model',
          existingPipeline: false,
          fieldMappings: [
            {
              sourceField: 'body',
              targetField: 'ml.inference.body',
            },
          ],
        });
        MLInferenceLogic.actions.fetchPipelineSuccess({
          'mock-pipeline': {},
        });

        expect(MLInferenceLogic.values.formErrors).toEqual({
          pipelineName: 'Name already used by another pipeline.',
        });
      });
      it('has errors when non-deployed model is selected', () => {
        MLInferenceLogic.actions.setInferencePipelineConfiguration({
          ...MLInferenceLogic.values.addInferencePipelineModal.configuration,
          pipelineName: 'unit-test-pipeline',
          modelID: 'unit-test-model',
          existingPipeline: false,
          fieldMappings: [
            {
              sourceField: 'body',
              targetField: 'ml.inference.body',
            },
          ],
          isModelPlaceholderSelected: true,
        });

        expect(MLInferenceLogic.values.formErrors).toEqual({
          modelStatus: 'Model must be deployed before use.',
        });
      });
    });
    describe('mlInferencePipeline', () => {
      it('returns undefined when configuration is invalid', () => {
        MLInferenceLogic.actions.setInferencePipelineConfiguration({
          modelID: '',
          pipelineName: '', // Invalid
          fieldMappings: [], // Invalid
          targetField: '',
        });

        expect(MLInferenceLogic.values.mlInferencePipeline).toBeUndefined();
      });
      it('generates inference pipeline', () => {
        CachedFetchModelsApiLogic.actions.apiSuccess(MODELS);
        MLInferenceLogic.actions.setInferencePipelineConfiguration({
          modelID: MODELS[0].modelId,
          pipelineName: 'unit-test',
          fieldMappings: [
            {
              sourceField: 'body',
              targetField: 'ml.inference.body',
            },
          ],
          targetField: '',
        });

        expect(MLInferenceLogic.values.mlInferencePipeline).not.toBeUndefined();
      });
      it('returns undefined when existing pipeline not yet selected', () => {
        MLInferenceLogic.actions.setInferencePipelineConfiguration({
          existingPipeline: true,
          modelID: '',
          pipelineName: '',
          fieldMappings: [],
          targetField: '',
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
          modelID: '',
          pipelineName: 'unit-test',
          fieldMappings: [
            {
              sourceField: 'body',
              targetField: 'ml.inference.body',
            },
          ],
          targetField: '',
        });
        expect(MLInferenceLogic.values.mlInferencePipeline).not.toBeUndefined();
        expect(MLInferenceLogic.values.mlInferencePipeline).toEqual(existingPipeline);
      });
    });
    describe('selectableModels', () => {
      it('makes fetch models request', () => {
        MLInferenceLogic.actions.fetchModelsApiSuccess(MODELS);

        expect(MLInferenceLogic.values.selectableModels).toBe(MODELS);
      });
    });
  });

  describe('listeners', () => {
    describe('clearModelPlaceholderFlag', () => {
      it('sets placeholder flag false for selected model', () => {
        MLInferenceLogic.actions.setInferencePipelineConfiguration({
          ...MLInferenceLogic.values.addInferencePipelineModal.configuration,
          modelID: 'unit-test-model',
          isModelPlaceholderSelected: true,
        });
        MLInferenceLogic.actions.clearModelPlaceholderFlag('unit-test-model');

        expect(
          MLInferenceLogic.values.addInferencePipelineModal.configuration.isModelPlaceholderSelected
        ).toBe(false);
      });
      it('leaves placeholder flag unmodified if another model was selected', () => {
        MLInferenceLogic.actions.setInferencePipelineConfiguration({
          ...MLInferenceLogic.values.addInferencePipelineModal.configuration,
          modelID: 'unit-test-model',
          isModelPlaceholderSelected: true,
        });
        MLInferenceLogic.actions.clearModelPlaceholderFlag('some-other-model-id');

        expect(
          MLInferenceLogic.values.addInferencePipelineModal.configuration.isModelPlaceholderSelected
        ).toBe(true);
      });
    });
    describe('createPipeline', () => {
      const mockModelConfiguration = {
        ...DEFAULT_VALUES.addInferencePipelineModal,
        configuration: {
          modelID: 'mock-model-id',
          pipelineName: 'mock-pipeline-name',
        },
        indexName: 'my-index-123',
      };
      it('calls makeCreatePipelineRequest with passed pipelineDefinition and fieldMappings', () => {
        mount({
          ...DEFAULT_VALUES,
          addInferencePipelineModal: {
            ...mockModelConfiguration,
            configuration: {
              ...mockModelConfiguration.configuration,
              modelID: MODELS[0].modelId,
              fieldMappings: [],
            },
          },
        });
        jest.spyOn(MLInferenceLogic.actions, 'makeCreatePipelineRequest');

        CachedFetchModelsApiLogic.actions.apiSuccess(MODELS);
        MLInferenceLogic.actions.selectFields(['my_source_field1', 'my_source_field2']);
        MLInferenceLogic.actions.addSelectedFieldsToMapping(true);
        MLInferenceLogic.actions.createPipeline();

        expect(MLInferenceLogic.actions.makeCreatePipelineRequest).toHaveBeenCalledWith({
          indexName: mockModelConfiguration.indexName,
          inferenceConfig: undefined,
          modelId: MODELS[0].modelId,
          fieldMappings: [
            {
              sourceField: 'my_source_field1',
              targetField: 'ml.inference.my_source_field1_expanded',
            },
            {
              sourceField: 'my_source_field2',
              targetField: 'ml.inference.my_source_field2_expanded',
            },
          ],
          pipelineDefinition: expect.any(Object), // Generation logic is tested elsewhere
          pipelineName: mockModelConfiguration.configuration.pipelineName,
        });
      });
    });
    describe('startTextExpansionModelSuccess', () => {
      it('fetches ml models', () => {
        jest.spyOn(MLInferenceLogic.actions, 'startPollingModels');
        StartTextExpansionModelApiLogic.actions.apiSuccess({
          deploymentState: 'started',
          modelId: 'foo',
        });

        expect(MLInferenceLogic.actions.startPollingModels).toHaveBeenCalled();
      });
    });
    describe('onAddInferencePipelineStepChange', () => {
      it('calls setAddInferencePipelineStep with given step', () => {
        jest.spyOn(MLInferenceLogic.actions, 'setAddInferencePipelineStep');
        MLInferenceLogic.actions.onAddInferencePipelineStepChange(AddInferencePipelineSteps.Fields);
        expect(MLInferenceLogic.actions.setAddInferencePipelineStep).toHaveBeenCalledWith(
          AddInferencePipelineSteps.Fields
        );
      });
      it('triggers pipeline and model fetch when moving from configuration step', () => {
        MLInferenceLogic.actions.setInferencePipelineConfiguration({
          ...MLInferenceLogic.values.addInferencePipelineModal.configuration,
          pipelineName: 'unit-test-pipeline',
          modelID: 'unit-test-model',
          existingPipeline: false,
        });
        jest.spyOn(MLInferenceLogic.actions, 'fetchPipelineByName');
        jest.spyOn(MLInferenceLogic.actions, 'startPollingModels');
        MLInferenceLogic.actions.onAddInferencePipelineStepChange(AddInferencePipelineSteps.Fields);
        expect(MLInferenceLogic.actions.fetchPipelineByName).toHaveBeenCalledWith({
          pipelineName: 'ml-inference-unit-test-pipeline',
        });
        expect(MLInferenceLogic.actions.startPollingModels).toHaveBeenCalled();
      });
      it('does not trigger pipeline and model fetch existing pipeline is selected', () => {
        MLInferenceLogic.actions.setInferencePipelineConfiguration({
          ...MLInferenceLogic.values.addInferencePipelineModal.configuration,
          pipelineName: 'unit-test-pipeline',
          modelID: 'unit-test-model',
          existingPipeline: true,
        });
        jest.spyOn(MLInferenceLogic.actions, 'fetchPipelineByName');
        jest.spyOn(MLInferenceLogic.actions, 'startPollingModels');
        MLInferenceLogic.actions.onAddInferencePipelineStepChange(AddInferencePipelineSteps.Fields);
        expect(MLInferenceLogic.actions.fetchPipelineByName).not.toHaveBeenCalled();
        expect(MLInferenceLogic.actions.startPollingModels).not.toHaveBeenCalled();
      });
    });
    describe('fetchPipelineSuccess', () => {
      it('goes back to configuration step when pipeline is found', () => {
        jest.spyOn(MLInferenceLogic.actions, 'setAddInferencePipelineStep');

        MLInferenceLogic.actions.fetchPipelineSuccess({
          'mock-pipeline': {},
        });
        expect(MLInferenceLogic.actions.setAddInferencePipelineStep).toHaveBeenCalledWith(
          AddInferencePipelineSteps.Configuration
        );
      });
    });
  });
});
