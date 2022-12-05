/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../../__mocks__/kea_logic';
import { nerModel } from '../../../../__mocks__/ml_models.mock';

import { HttpResponse } from '@kbn/core/public';
import { TrainedModelConfigResponse } from '@kbn/ml-plugin/common/types/trained_models';

import { ErrorResponse, HttpError, Status } from '../../../../../../../common/types/api';
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
  AddInferencePipelineSteps,
  MLInferenceProcessorsValues,
} from './ml_inference_logic';

const DEFAULT_VALUES: MLInferenceProcessorsValues = {
  addInferencePipelineModal: {
    configuration: {
      ...EMPTY_PIPELINE_CONFIGURATION,
    },
    indexName: '',
    simulateBody: `[

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
  getDocumentApiErrorMessage: undefined,
  getDocumentApiStatus: Status.IDLE,
  getDocumentData: undefined,
  getDocumentsErr: '',
  index: null,
  isGetDocumentsLoading: false,
  isLoading: true,
  isPipelineDataValid: false,
  mappingData: undefined,
  mappingStatus: 0,
  mlInferencePipeline: undefined,
  mlInferencePipelineProcessors: undefined,
  mlInferencePipelinesData: undefined,
  mlModelsData: null,
  mlModelsStatus: 0,
  showGetDocumentErrors: false,
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
          modelId: 'test-model',
          pipelineName: 'unit-test',
          sourceField: 'body',
        });
        expect(MLInferenceLogic.values.createErrors).toHaveLength(0);
      });
    });
    describe('getDocumentApiSuccess', () => {
      it('sets simulateBody text to the returned document', () => {
        GetDocumentsApiLogic.actions.apiSuccess({
          _id: 'test-index-123',
          _index: 'test-index',
          found: true,
        });
        expect(MLInferenceLogic.values.addInferencePipelineModal.simulateBody).toEqual(
          JSON.stringify(
            [
              {
                _id: 'test-index-123',
                _index: 'test-index',
                found: true,
              },
            ],
            undefined,
            2
          )
        );
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
      it('returns existing simulation result when API is successful', () => {
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
        SimulateExistingMlInterfacePipelineApiLogic.actions.apiSuccess(simulateResponse);

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
    describe('getDocumentsErr', () => {
      it('returns empty string when no error is present', () => {
        GetDocumentsApiLogic.actions.apiSuccess({
          _id: 'test-123',
          _index: 'test',
          found: true,
        });
        expect(MLInferenceLogic.values.getDocumentsErr).toEqual('');
      });
      it('returns extracted error message from the http response', () => {
        GetDocumentsApiLogic.actions.apiError({
          body: {
            error: 'document-not-found',
            message: 'not-found',
            statusCode: 404,
          },
        } as HttpError);
        expect(MLInferenceLogic.values.getDocumentsErr).toEqual('not-found');
      });
    });
    describe('showGetDocumentErrors', () => {
      it('returns false when no error is present', () => {
        GetDocumentsApiLogic.actions.apiSuccess({
          _id: 'test-123',
          _index: 'test',
          found: true,
        });
        expect(MLInferenceLogic.values.showGetDocumentErrors).toEqual(false);
      });
      it('returns true when an error message is present', () => {
        GetDocumentsApiLogic.actions.apiError({
          body: {
            error: 'document-not-found',
            message: 'not-found',
            statusCode: 404,
          },
        } as HttpError);
        expect(MLInferenceLogic.values.showGetDocumentErrors).toEqual(true);
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
    describe('simulatePipeline', () => {
      const mockModelConfiguration = {
        ...DEFAULT_VALUES.addInferencePipelineModal,
        configuration: {
          destinationField: '',
          modelID: nerModel.model_id,
          pipelineName: 'mock-pipeline-name',
          sourceField: 'mock_text_field',
        },
        indexName: 'my-index-123',
      };
      const mlModelsData: TrainedModelConfigResponse[] = [nerModel];
      it('does nothing if mlInferencePipeline is undefined', () => {
        mount({
          ...DEFAULT_VALUES,
        });

        jest.spyOn(MLInferenceLogic.actions, 'setSimulatePipelineErrors');
        jest.spyOn(MLInferenceLogic.actions, 'simulateExistingPipelineApiReset');
        jest.spyOn(MLInferenceLogic.actions, 'simulatePipelineApiReset');
        jest.spyOn(MLInferenceLogic.actions, 'makeSimulateExistingPipelineRequest');
        jest.spyOn(MLInferenceLogic.actions, 'makeSimulatePipelineRequest');

        MLInferenceLogic.actions.simulatePipeline();

        expect(MLInferenceLogic.actions.setSimulatePipelineErrors).toHaveBeenCalledTimes(0);
        expect(MLInferenceLogic.actions.simulateExistingPipelineApiReset).toHaveBeenCalledTimes(0);
        expect(MLInferenceLogic.actions.simulatePipelineApiReset).toHaveBeenCalledTimes(0);
        expect(MLInferenceLogic.actions.makeSimulateExistingPipelineRequest).toHaveBeenCalledTimes(
          0
        );
        expect(MLInferenceLogic.actions.makeSimulatePipelineRequest).toHaveBeenCalledTimes(0);
      });
      it('clears simulate errors', () => {
        mount({
          ...DEFAULT_VALUES,
          addInferencePipelineModal: {
            ...mockModelConfiguration,
          },
        });
        MLModelsApiLogic.actions.apiSuccess(mlModelsData);
        jest.spyOn(MLInferenceLogic.actions, 'setSimulatePipelineErrors');
        MLInferenceLogic.actions.simulatePipeline();
        expect(MLInferenceLogic.actions.setSimulatePipelineErrors).toHaveBeenCalledWith([]);
      });
      it('resets API logics', () => {
        mount({
          ...DEFAULT_VALUES,
          addInferencePipelineModal: {
            ...mockModelConfiguration,
          },
        });
        MLModelsApiLogic.actions.apiSuccess(mlModelsData);

        jest.spyOn(MLInferenceLogic.actions, 'simulateExistingPipelineApiReset');
        jest.spyOn(MLInferenceLogic.actions, 'simulatePipelineApiReset');

        MLInferenceLogic.actions.simulatePipeline();

        expect(MLInferenceLogic.actions.simulateExistingPipelineApiReset).toHaveBeenCalledTimes(1);
        expect(MLInferenceLogic.actions.simulatePipelineApiReset).toHaveBeenCalledTimes(1);
      });
      it('calls simulate with new pipeline', () => {
        mount({
          ...DEFAULT_VALUES,
          addInferencePipelineModal: {
            ...mockModelConfiguration,
          },
        });
        MLModelsApiLogic.actions.apiSuccess(mlModelsData);

        jest.spyOn(MLInferenceLogic.actions, 'makeSimulateExistingPipelineRequest');
        jest.spyOn(MLInferenceLogic.actions, 'makeSimulatePipelineRequest');

        MLInferenceLogic.actions.simulatePipeline();

        expect(MLInferenceLogic.actions.makeSimulatePipelineRequest).toHaveBeenCalledTimes(1);
        expect(MLInferenceLogic.actions.makeSimulateExistingPipelineRequest).toHaveBeenCalledTimes(
          0
        );
      });
      it('calls simulate existing with existing pipeline', () => {
        mount({
          ...DEFAULT_VALUES,
          addInferencePipelineModal: {
            ...mockModelConfiguration,
            configuration: {
              ...mockModelConfiguration.configuration,
              existingPipeline: true,
              pipelineName: 'my-test-pipeline',
            },
          },
        });
        MLModelsApiLogic.actions.apiSuccess(mlModelsData);
        FetchMlInferencePipelinesApiLogic.actions.apiSuccess({
          'my-test-pipeline': {},
        });

        jest.spyOn(MLInferenceLogic.actions, 'makeSimulateExistingPipelineRequest');
        jest.spyOn(MLInferenceLogic.actions, 'makeSimulatePipelineRequest');

        MLInferenceLogic.actions.simulatePipeline();

        expect(MLInferenceLogic.actions.makeSimulateExistingPipelineRequest).toHaveBeenCalledTimes(
          1
        );
        expect(MLInferenceLogic.actions.makeSimulatePipelineRequest).toHaveBeenCalledTimes(0);
      });
    });
  });
});
