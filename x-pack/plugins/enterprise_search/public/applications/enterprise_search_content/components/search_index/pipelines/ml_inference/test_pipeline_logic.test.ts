/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../../__mocks__/kea_logic';
import { nerModel } from '../../../../__mocks__/ml_models.mock';
import { mockMlInferenceValues } from './__mocks__/ml_inference_logic.mock';

import { HttpError, Status } from '../../../../../../../common/types/api';
import { MlInferencePipeline } from '../../../../../../../common/types/pipelines';
import { GetDocumentsApiLogic } from '../../../../api/documents/get_document_logic';
import { SimulateExistingMlInterfacePipelineApiLogic } from '../../../../api/pipelines/simulate_existing_ml_inference_pipeline';
import { SimulateMlInterfacePipelineApiLogic } from '../../../../api/pipelines/simulate_ml_inference_pipeline_processors';

import { TestPipelineLogic, TestPipelineValues } from './test_pipeline_logic';
import { AddInferencePipelineSteps } from './types';

const DEFAULT_VALUES: TestPipelineValues = {
  addInferencePipelineModal: {
    configuration: {
      destinationField: '',
      modelID: '',
      pipelineName: '',
      sourceField: '',
    },
    indexName: '',
    step: AddInferencePipelineSteps.Configuration,
  },
  getDocumentApiErrorMessage: undefined,
  getDocumentApiStatus: 0,
  getDocumentData: undefined,
  getDocumentsErr: '',
  isGetDocumentsLoading: false,
  mlInferencePipeline: undefined,
  showGetDocumentErrors: false,
  simulateBody: `[

]`,
  simulateExistingPipelineData: undefined,
  simulateExistingPipelineStatus: 0,
  simulatePipelineData: undefined,
  simulatePipelineErrors: [],
  simulatePipelineResult: undefined,
  simulatePipelineStatus: 0,
};

const mockInferencePipeline: MlInferencePipeline = {
  processors: [],
  version: 1,
};

describe('TestPipelineLogic', () => {
  const { mount } = new LogicMounter(TestPipelineLogic);
  const { mount: mountSimulateExistingMlInterfacePipelineApiLogic } = new LogicMounter(
    SimulateExistingMlInterfacePipelineApiLogic
  );
  const { mount: mountSimulateMlInterfacePipelineApiLogic } = new LogicMounter(
    SimulateMlInterfacePipelineApiLogic
  );
  const { mount: mountGetDocumentsApiLogic } = new LogicMounter(GetDocumentsApiLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    mockMlInferenceValues.addInferencePipelineModal = {
      configuration: {
        destinationField: '',
        modelID: '',
        pipelineName: '',
        sourceField: '',
      },
      indexName: '',
      step: AddInferencePipelineSteps.Configuration,
    };
    mockMlInferenceValues.mlInferencePipeline = undefined;

    mountSimulateExistingMlInterfacePipelineApiLogic();
    mountSimulateMlInterfacePipelineApiLogic();
    mountGetDocumentsApiLogic();
    mount();
  });

  describe('actions', () => {
    describe('setSimulatePipelineErrors', () => {
      it('sets simulatePipelineErrors to passed payload', () => {
        expect(TestPipelineLogic.values.simulatePipelineErrors).toEqual(
          DEFAULT_VALUES.simulatePipelineErrors
        );

        TestPipelineLogic.actions.setSimulatePipelineErrors([
          'I would be an error coming from Backend',
          'I would be another one',
        ]);

        expect(TestPipelineLogic.values.simulatePipelineErrors).toEqual([
          'I would be an error coming from Backend',
          'I would be another one',
        ]);
      });
    });
    describe('getDocumentApiSuccess', () => {
      it('sets simulateBody text to the returned document', () => {
        const document = {
          _id: 'test-index-123',
          _index: 'test-index',
          _source: {
            foo: 'bar',
          },
          found: true,
        };
        GetDocumentsApiLogic.actions.apiSuccess(document);
        expect(TestPipelineLogic.values.simulateBody).toEqual(
          JSON.stringify([document], undefined, 2)
        );
      });
    });
  });
  describe('listeners', () => {
    describe('simulatePipeline', () => {
      const mockModelConfiguration = {
        configuration: {
          destinationField: '',
          modelID: nerModel.model_id,
          pipelineName: 'mock-pipeline-name',
          sourceField: 'mock_text_field',
        },
        indexName: 'my-index-123',
      };

      it('does nothing if mlInferencePipeline is undefined', () => {
        jest.spyOn(TestPipelineLogic.actions, 'setSimulatePipelineErrors');
        jest.spyOn(TestPipelineLogic.actions, 'simulateExistingPipelineApiReset');
        jest.spyOn(TestPipelineLogic.actions, 'simulatePipelineApiReset');
        jest.spyOn(TestPipelineLogic.actions, 'makeSimulateExistingPipelineRequest');
        jest.spyOn(TestPipelineLogic.actions, 'makeSimulatePipelineRequest');

        TestPipelineLogic.actions.simulatePipeline();

        expect(TestPipelineLogic.actions.setSimulatePipelineErrors).toHaveBeenCalledTimes(0);
        expect(TestPipelineLogic.actions.simulateExistingPipelineApiReset).toHaveBeenCalledTimes(0);
        expect(TestPipelineLogic.actions.simulatePipelineApiReset).toHaveBeenCalledTimes(0);
        expect(TestPipelineLogic.actions.makeSimulateExistingPipelineRequest).toHaveBeenCalledTimes(
          0
        );
        expect(TestPipelineLogic.actions.makeSimulatePipelineRequest).toHaveBeenCalledTimes(0);
      });
      it('clears simulate errors', () => {
        mockMlInferenceValues.addInferencePipelineModal = {
          ...mockModelConfiguration,
        };
        mockMlInferenceValues.mlInferencePipeline = mockInferencePipeline;

        jest.spyOn(TestPipelineLogic.actions, 'setSimulatePipelineErrors');
        TestPipelineLogic.actions.simulatePipeline();
        expect(TestPipelineLogic.actions.setSimulatePipelineErrors).toHaveBeenCalledWith([]);
      });
      it('resets API logics', () => {
        mockMlInferenceValues.addInferencePipelineModal = {
          ...mockModelConfiguration,
        };
        mockMlInferenceValues.mlInferencePipeline = mockInferencePipeline;

        jest.spyOn(TestPipelineLogic.actions, 'simulateExistingPipelineApiReset');
        jest.spyOn(TestPipelineLogic.actions, 'simulatePipelineApiReset');

        TestPipelineLogic.actions.simulatePipeline();

        expect(TestPipelineLogic.actions.simulateExistingPipelineApiReset).toHaveBeenCalledTimes(1);
        expect(TestPipelineLogic.actions.simulatePipelineApiReset).toHaveBeenCalledTimes(1);
      });
      it('calls simulate with new pipeline', () => {
        mockMlInferenceValues.addInferencePipelineModal = {
          ...mockModelConfiguration,
        };
        mockMlInferenceValues.mlInferencePipeline = mockInferencePipeline;

        jest.spyOn(TestPipelineLogic.actions, 'makeSimulateExistingPipelineRequest');
        jest.spyOn(TestPipelineLogic.actions, 'makeSimulatePipelineRequest');

        TestPipelineLogic.actions.simulatePipeline();

        expect(TestPipelineLogic.actions.makeSimulatePipelineRequest).toHaveBeenCalledTimes(1);
        expect(TestPipelineLogic.actions.makeSimulateExistingPipelineRequest).toHaveBeenCalledTimes(
          0
        );
      });
      it('calls simulate existing with existing pipeline', () => {
        mockMlInferenceValues.addInferencePipelineModal = {
          ...mockModelConfiguration,
          configuration: {
            ...mockModelConfiguration.configuration,
            existingPipeline: true,
            pipelineName: 'my-test-pipeline',
          },
        };
        mockMlInferenceValues.mlInferencePipeline = mockInferencePipeline;

        jest.spyOn(TestPipelineLogic.actions, 'makeSimulateExistingPipelineRequest');
        jest.spyOn(TestPipelineLogic.actions, 'makeSimulatePipelineRequest');

        TestPipelineLogic.actions.simulatePipeline();

        expect(TestPipelineLogic.actions.makeSimulateExistingPipelineRequest).toHaveBeenCalledTimes(
          1
        );
        expect(TestPipelineLogic.actions.makeSimulatePipelineRequest).toHaveBeenCalledTimes(0);
      });
    });
  });
  describe('selectors', () => {
    describe('simulatePipelineResult', () => {
      it('returns undefined if simulatePipelineStatus is not success', () => {
        SimulateMlInterfacePipelineApiLogic.actions.apiError({} as HttpError);
        expect(TestPipelineLogic.values).toEqual({
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

        expect(TestPipelineLogic.values.simulatePipelineResult).toEqual(simulateResponse);
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

        expect(TestPipelineLogic.values.simulatePipelineResult).toEqual(simulateResponse);
      });
    });
    describe('getDocumentsErr', () => {
      it('returns empty string when no error is present', () => {
        GetDocumentsApiLogic.actions.apiSuccess({
          _id: 'test-123',
          _index: 'test',
          found: true,
        });
        expect(TestPipelineLogic.values.getDocumentsErr).toEqual('');
      });
      it('returns extracted error message from the http response', () => {
        GetDocumentsApiLogic.actions.apiError({
          body: {
            error: 'document-not-found',
            message: 'not-found',
            statusCode: 404,
          },
        } as HttpError);
        expect(TestPipelineLogic.values.getDocumentsErr).toEqual('not-found');
      });
    });
    describe('showGetDocumentErrors', () => {
      it('returns false when no error is present', () => {
        GetDocumentsApiLogic.actions.apiSuccess({
          _id: 'test-123',
          _index: 'test',
          found: true,
        });
        expect(TestPipelineLogic.values.showGetDocumentErrors).toEqual(false);
      });
      it('returns true when an error message is present', () => {
        GetDocumentsApiLogic.actions.apiError({
          body: {
            error: 'document-not-found',
            message: 'not-found',
            statusCode: 404,
          },
        } as HttpError);
        expect(TestPipelineLogic.values.showGetDocumentErrors).toEqual(true);
      });
    });
  });
});
