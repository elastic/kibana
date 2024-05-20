/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { IngestSimulateResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { Status, HttpError } from '../../../../../../../common/types/api';
import { MlInferencePipeline } from '../../../../../../../common/types/pipelines';

import { Actions } from '../../../../../shared/api_logic/create_api_logic';
import { getErrorsFromHttpResponse } from '../../../../../shared/flash_messages/handle_api_errors';
import {
  GetDocumentsApiLogic,
  GetDocumentsArgs,
  GetDocumentsResponse,
} from '../../../../api/documents/get_document_logic';
import {
  SimulateExistingMlInterfacePipelineApiLogic,
  SimulateExistingMlInterfacePipelineArgs,
  SimulateExistingMlInterfacePipelineResponse,
} from '../../../../api/pipelines/simulate_existing_ml_inference_pipeline';
import {
  SimulateMlInterfacePipelineApiLogic,
  SimulateMlInterfacePipelineArgs,
  SimulateMlInterfacePipelineResponse,
} from '../../../../api/pipelines/simulate_ml_inference_pipeline_processors';

import { AddInferencePipelineModal, MLInferenceLogic } from './ml_inference_logic';

export interface TestPipelineActions {
  getDocumentApiError: Actions<GetDocumentsArgs, GetDocumentsResponse>['apiError'];
  getDocumentApiSuccess: Actions<GetDocumentsArgs, GetDocumentsResponse>['apiSuccess'];
  makeGetDocumentRequest: Actions<GetDocumentsArgs, GetDocumentsResponse>['makeRequest'];
  makeSimulateExistingPipelineRequest: Actions<
    SimulateExistingMlInterfacePipelineArgs,
    SimulateExistingMlInterfacePipelineResponse
  >['makeRequest'];
  makeSimulatePipelineRequest: Actions<
    SimulateMlInterfacePipelineArgs,
    SimulateMlInterfacePipelineResponse
  >['makeRequest'];
  setPipelineSimulateBody: (simulateBody: string) => {
    simulateBody: string;
  };
  setSimulatePipelineErrors(errors: string[]): { errors: string[] };
  simulateExistingPipelineApiError: Actions<
    SimulateExistingMlInterfacePipelineArgs,
    SimulateExistingMlInterfacePipelineResponse
  >['apiError'];
  simulateExistingPipelineApiReset: Actions<
    SimulateExistingMlInterfacePipelineArgs,
    SimulateExistingMlInterfacePipelineResponse
  >['apiReset'];
  simulateExistingPipelineApiSuccess: Actions<
    SimulateExistingMlInterfacePipelineArgs,
    SimulateExistingMlInterfacePipelineResponse
  >['apiSuccess'];
  simulatePipeline: () => void;
  simulatePipelineApiError: Actions<
    SimulateMlInterfacePipelineArgs,
    SimulateMlInterfacePipelineResponse
  >['apiError'];
  simulatePipelineApiReset: Actions<
    SimulateMlInterfacePipelineArgs,
    SimulateMlInterfacePipelineResponse
  >['apiReset'];
  simulatePipelineApiSuccess: Actions<
    SimulateMlInterfacePipelineArgs,
    SimulateMlInterfacePipelineResponse
  >['apiSuccess'];
}

export interface TestPipelineValues {
  addInferencePipelineModal: AddInferencePipelineModal;
  getDocumentApiErrorMessage: HttpError | undefined;
  getDocumentApiStatus: Status;
  getDocumentData: typeof GetDocumentsApiLogic.values.data;
  getDocumentsErr: string;
  isGetDocumentsLoading: boolean;
  mlInferencePipeline: MlInferencePipeline | undefined;
  showGetDocumentErrors: boolean;
  simulateBody: string;
  simulateExistingPipelineData: typeof SimulateExistingMlInterfacePipelineApiLogic.values.data;
  simulateExistingPipelineStatus: Status;
  simulatePipelineData: typeof SimulateMlInterfacePipelineApiLogic.values.data;
  simulatePipelineErrors: string[];
  simulatePipelineResult: IngestSimulateResponse | undefined;
  simulatePipelineStatus: Status;
}

export const TestPipelineLogic = kea<MakeLogicType<TestPipelineValues, TestPipelineActions>>({
  actions: {
    setPipelineSimulateBody: (simulateBody: string) => ({
      simulateBody,
    }),
    setSimulatePipelineErrors: (errors: string[]) => ({ errors }),
    simulatePipeline: true,
  },
  connect: {
    actions: [
      GetDocumentsApiLogic,
      [
        'apiError as getDocumentApiError',
        'apiSuccess as getDocumentApiSuccess',
        'makeRequest as makeGetDocumentRequest',
      ],
      SimulateExistingMlInterfacePipelineApiLogic,
      [
        'makeRequest as makeSimulateExistingPipelineRequest',
        'apiSuccess as simulateExistingPipelineApiSuccess',
        'apiError as simulateExistingPipelineApiError',
        'apiReset as simulateExistingPipelineApiReset',
      ],
      SimulateMlInterfacePipelineApiLogic,
      [
        'makeRequest as makeSimulatePipelineRequest',
        'apiSuccess as simulatePipelineApiSuccess',
        'apiError as simulatePipelineApiError',
        'apiReset as simulatePipelineApiReset',
      ],
    ],
    values: [
      GetDocumentsApiLogic,
      [
        'data as getDocumentData',
        'status as getDocumentApiStatus',
        'error as getDocumentApiErrorMessage',
      ],
      SimulateExistingMlInterfacePipelineApiLogic,
      ['data as simulateExistingPipelineData', 'status as simulateExistingPipelineStatus'],
      SimulateMlInterfacePipelineApiLogic,
      ['data as simulatePipelineData', 'status as simulatePipelineStatus'],
      MLInferenceLogic,
      ['addInferencePipelineModal', 'mlInferencePipeline'],
    ],
  },
  listeners: ({ values, actions }) => ({
    getDocumentApiSuccess: (document) => {
      actions.setPipelineSimulateBody(JSON.stringify([document], undefined, 2));
    },
    simulatePipeline: () => {
      if (values.mlInferencePipeline) {
        actions.setSimulatePipelineErrors([]);
        actions.simulateExistingPipelineApiReset();
        actions.simulatePipelineApiReset();
        const { configuration } = values.addInferencePipelineModal;
        if (configuration.existingPipeline) {
          actions.makeSimulateExistingPipelineRequest({
            docs: values.simulateBody,
            indexName: values.addInferencePipelineModal.indexName,
            pipelineName: configuration.pipelineName,
          });
        } else {
          actions.makeSimulatePipelineRequest({
            docs: values.simulateBody,
            indexName: values.addInferencePipelineModal.indexName,
            pipeline: values.mlInferencePipeline,
          });
        }
      }
    },
  }),
  path: ['enterprise_search', 'content', 'pipelines_test_inference_pipeline'],
  reducers: {
    simulateBody: [
      `[

]`,
      {
        setPipelineSimulateBody: (_, { simulateBody }) => simulateBody,
      },
    ],
    simulatePipelineErrors: [
      [],
      {
        setSimulatePipelineErrors: (_, { errors }) => errors,
        simulateExistingPipelineApiError: (_, error) => getErrorsFromHttpResponse(error),
        simulatePipelineApiError: (_, error) => getErrorsFromHttpResponse(error),
      },
    ],
  },
  selectors: ({ selectors }) => ({
    getDocumentsErr: [
      () => [selectors.getDocumentApiErrorMessage],
      (err: TestPipelineValues['getDocumentApiErrorMessage']) => {
        if (!err) return '';
        return getErrorsFromHttpResponse(err)[0];
      },
    ],
    isGetDocumentsLoading: [
      () => [selectors.getDocumentApiStatus],
      (status) => {
        return status === Status.LOADING;
      },
    ],
    showGetDocumentErrors: [
      () => [selectors.getDocumentApiStatus],
      (status: TestPipelineValues['getDocumentApiStatus']) => {
        return status === Status.ERROR;
      },
    ],
    simulatePipelineResult: [
      () => [
        selectors.simulatePipelineStatus,
        selectors.simulatePipelineData,
        selectors.simulateExistingPipelineStatus,
        selectors.simulateExistingPipelineData,
      ],
      (
        status: Status,
        simulateResult: IngestSimulateResponse | undefined,
        exStatus: Status,
        exSimulateResult: IngestSimulateResponse | undefined
      ) => {
        if (exStatus === Status.SUCCESS) return exSimulateResult;
        if (status === Status.SUCCESS) return simulateResult;
        return undefined;
      },
    ],
  }),
});
