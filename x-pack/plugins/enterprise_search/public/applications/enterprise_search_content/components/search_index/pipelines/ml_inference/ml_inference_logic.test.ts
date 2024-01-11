/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../../__mocks__/kea_logic';
import { nerModel, textExpansionModel } from '../../../../__mocks__/ml_models.mock';

import { HttpResponse } from '@kbn/core/public';

import { ErrorResponse } from '../../../../../../../common/types/api';
import { TrainedModelState } from '../../../../../../../common/types/pipelines';

import { GetDocumentsApiLogic } from '../../../../api/documents/get_document_logic';
import { MappingsApiLogic } from '../../../../api/mappings/mappings_logic';
import { MLModelsApiLogic } from '../../../../api/ml_models/ml_models_logic';
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
  existingInferencePipelines: [],
  formErrors: {
    fieldMappings: 'Field is required.',
    modelID: 'Field is required.',
    pipelineName: 'Field is required.',
  },
  index: null,
  isConfigureStepValid: false,
  isLoading: true,
  isPipelineDataValid: false,
  isTextExpansionModelSelected: false,
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
  const { mount: mountStartTextExpansionModel } = new LogicMounter(StartTextExpansionModelApiLogic);

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
    mountStartTextExpansionModel();
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
            disabled: false,
            modelId: 'test-model',
            modelType: '',
            pipelineName: 'unit-test',
            sourceFields: ['body'],
            indexFields: ['body'],
          },
        ]);
      });
      it('returns disabled pipeline option if missing source fields', () => {
        FetchMlInferencePipelinesApiLogic.actions.apiSuccess({
          'unit-test': {
            processors: [
              {
                inference: {
                  field_map: {
                    title: 'text_field', // Does not exist in index
                  },
                  model_id: 'test-model',
                  target_field: 'ml.inference.title',
                },
              },
              {
                inference: {
                  field_map: {
                    body: 'text_field', // Exists in index
                  },
                  model_id: 'test-model',
                  target_field: 'ml.inference.body',
                },
              },
              {
                inference: {
                  field_map: {
                    body_content: 'text_field', // Does not exist in index
                  },
                  model_id: 'test-model',
                  target_field: 'ml.inference.body_content',
                },
              },
            ],
            version: 1,
          },
        });

        expect(MLInferenceLogic.values.existingInferencePipelines).toEqual([
          {
            disabled: true,
            disabledReason: expect.stringContaining('title, body_content'),
            modelId: 'test-model',
            modelType: '',
            pipelineName: 'unit-test',
            sourceFields: ['title', 'body', 'body_content'],
            indexFields: ['body'],
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
            disabled: false,
            pipelineName: 'unit-test',
            modelType: '',
            modelId: '',
            sourceFields: ['body'],
            indexFields: ['body'],
          },
        ]);
      });
      it('filters pipeline if pipeline already attached', () => {
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

        expect(MLInferenceLogic.values.existingInferencePipelines).toEqual([]);
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
        MLModelsApiLogic.actions.apiSuccess([nerModel]);
        MLInferenceLogic.actions.setInferencePipelineConfiguration({
          modelID: nerModel.model_id,
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
    describe('supportedMLModels', () => {
      it('filters unsupported ML models', () => {
        MLModelsApiLogic.actions.apiSuccess([
          {
            inference_config: {
              ner: {},
            },
            input: {
              field_names: ['text_field'],
            },
            model_id: 'ner-mocked-model',
            model_type: 'pytorch',
            tags: [],
            version: '1',
          },
          {
            inference_config: {
              some_unsupported_task_type: {},
            },
            input: {
              field_names: ['text_field'],
            },
            model_id: 'unsupported-mocked-model',
            model_type: 'pytorch',
            tags: [],
            version: '1',
          },
        ]);

        expect(MLInferenceLogic.values.supportedMLModels).toEqual([
          expect.objectContaining({
            inference_config: {
              ner: {},
            },
          }),
        ]);
      });

      it('promotes text_expansion ML models and sorts others by ID', () => {
        MLModelsApiLogic.actions.apiSuccess([
          {
            inference_config: {
              ner: {},
            },
            input: {
              field_names: ['text_field'],
            },
            model_id: 'ner-mocked-model',
            model_type: 'pytorch',
            tags: [],
            version: '1',
          },
          {
            inference_config: {
              text_expansion: {},
            },
            input: {
              field_names: ['text_field'],
            },
            model_id: 'text-expansion-mocked-model',
            model_type: 'pytorch',
            tags: [],
            version: '1',
          },
          {
            inference_config: {
              text_embedding: {},
            },
            input: {
              field_names: ['text_field'],
            },
            model_id: 'text-embedding-mocked-model',
            model_type: 'pytorch',
            tags: [],
            version: '1',
          },
        ]);

        expect(MLInferenceLogic.values.supportedMLModels).toEqual([
          expect.objectContaining({
            inference_config: {
              text_expansion: {},
            },
          }),
          expect.objectContaining({
            inference_config: {
              ner: {},
            },
          }),
          expect.objectContaining({
            inference_config: {
              text_embedding: {},
            },
          }),
        ]);
      });
    });
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
              modelID: textExpansionModel.model_id,
              fieldMappings: [],
            },
          },
        });
        jest.spyOn(MLInferenceLogic.actions, 'makeCreatePipelineRequest');

        MLModelsApiLogic.actions.apiSuccess([textExpansionModel]);
        MLInferenceLogic.actions.selectFields(['my_source_field1', 'my_source_field2']);
        MLInferenceLogic.actions.addSelectedFieldsToMapping(true);
        MLInferenceLogic.actions.createPipeline();

        expect(MLInferenceLogic.actions.makeCreatePipelineRequest).toHaveBeenCalledWith({
          indexName: mockModelConfiguration.indexName,
          inferenceConfig: undefined,
          modelId: textExpansionModel.model_id,
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
        jest.spyOn(MLInferenceLogic.actions, 'makeMLModelsRequest');
        StartTextExpansionModelApiLogic.actions.apiSuccess({
          deploymentState: 'started',
          modelId: 'foo',
        });

        expect(MLInferenceLogic.actions.makeMLModelsRequest).toHaveBeenCalledWith(undefined);
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
        jest.spyOn(MLInferenceLogic.actions, 'makeMLModelsRequest');
        MLInferenceLogic.actions.onAddInferencePipelineStepChange(AddInferencePipelineSteps.Fields);
        expect(MLInferenceLogic.actions.fetchPipelineByName).toHaveBeenCalledWith({
          pipelineName: 'ml-inference-unit-test-pipeline',
        });
        expect(MLInferenceLogic.actions.makeMLModelsRequest).toHaveBeenCalledWith(undefined);
      });
      it('does not trigger pipeline and model fetch existing pipeline is selected', () => {
        MLInferenceLogic.actions.setInferencePipelineConfiguration({
          ...MLInferenceLogic.values.addInferencePipelineModal.configuration,
          pipelineName: 'unit-test-pipeline',
          modelID: 'unit-test-model',
          existingPipeline: true,
        });
        jest.spyOn(MLInferenceLogic.actions, 'fetchPipelineByName');
        jest.spyOn(MLInferenceLogic.actions, 'makeMLModelsRequest');
        MLInferenceLogic.actions.onAddInferencePipelineStepChange(AddInferencePipelineSteps.Fields);
        expect(MLInferenceLogic.actions.fetchPipelineByName).not.toHaveBeenCalled();
        expect(MLInferenceLogic.actions.makeMLModelsRequest).not.toHaveBeenCalled();
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
