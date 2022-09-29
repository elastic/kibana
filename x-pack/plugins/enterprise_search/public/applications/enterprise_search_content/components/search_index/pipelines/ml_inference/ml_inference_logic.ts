/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { IndicesGetMappingIndexMappingRecord } from '@elastic/elasticsearch/lib/api/types';

import { TrainedModelConfigResponse } from '@kbn/ml-plugin/common/types/trained_models';

import {
  formatPipelineName,
  generateMlInferencePipelineBody,
} from '../../../../../../../common/ml_inference_pipeline';
import { HttpError, Status } from '../../../../../../../common/types/api';
import { MlInferencePipeline } from '../../../../../../../common/types/pipelines';

import { getErrorsFromHttpResponse } from '../../../../../shared/flash_messages/handle_api_errors';
import {
  FetchIndexApiLogic,
  FetchIndexApiResponse,
} from '../../../../api/index/fetch_index_api_logic';
import { MappingsApiLogic } from '../../../../api/mappings/mappings_logic';
import { CreateMlInferencePipelineApiLogic } from '../../../../api/ml_models/create_ml_inference_pipeline';
import { MLModelsApiLogic } from '../../../../api/ml_models/ml_models_logic';
import { SimulateMlInterfacePipelineApiLogic } from '../../../../api/pipelines/simulate_ml_inference_pipeline_processors';

import { isConnectorIndex } from '../../../../utils/indices';

import { AddInferencePipelineFormErrors, InferencePipelineConfiguration } from './types';

import {
  isSupportedMLModel,
  sortSourceFields,
  validateInferencePipelineConfiguration,
} from './utils';

export const EMPTY_PIPELINE_CONFIGURATION: InferencePipelineConfiguration = {
  destinationField: '',
  modelID: '',
  pipelineName: '',
  sourceField: '',
};

export enum AddInferencePipelineSteps {
  Configuration,
  Test,
  Review,
}

const API_REQUEST_COMPLETE_STATUSES = [Status.SUCCESS, Status.ERROR];
const DEFAULT_CONNECTOR_FIELDS = ['body', 'title', 'id', 'type', 'url'];

interface MLInferenceProcessorsActions {
  createApiError: (error: HttpError) => HttpError;
  createApiSuccess: typeof CreateMlInferencePipelineApiLogic.actions.apiSuccess;
  createPipeline: () => void;
  makeCreatePipelineRequest: typeof CreateMlInferencePipelineApiLogic.actions.makeRequest;
  makeMLModelsRequest: typeof MLModelsApiLogic.actions.makeRequest;
  makeMappingRequest: typeof MappingsApiLogic.actions.makeRequest;
  makeSimulatePipelineRequest: typeof SimulateMlInterfacePipelineApiLogic.actions.makeRequest;
  mappingsApiError(error: HttpError): HttpError;
  mlModelsApiError(error: HttpError): HttpError;
  setAddInferencePipelineStep: (step: AddInferencePipelineSteps) => {
    step: AddInferencePipelineSteps;
  };
  setCreateErrors(errors: string[]): { errors: string[] };
  setIndexName: (indexName: string) => { indexName: string };
  setInferencePipelineConfiguration: (configuration: InferencePipelineConfiguration) => {
    configuration: InferencePipelineConfiguration;
  };
  setPipelineSimulateBody: (simulateBody: string) => {
    simulateBody: string;
  };
  setSimulatePipelineErrors(errors: string[]): { errors: string[] };
  simulatePipeline: () => void;
  simulatePipelineApiError(error: HttpError): HttpError;
  simulatePipelineApiSuccess: typeof SimulateMlInterfacePipelineApiLogic.actions.apiSuccess;
}

export interface AddInferencePipelineModal {
  configuration: InferencePipelineConfiguration;
  indexName: string;
  simulateBody: string;
  step: AddInferencePipelineSteps;
}

interface MLInferenceProcessorsValues {
  addInferencePipelineModal: AddInferencePipelineModal;
  createErrors: string[];
  formErrors: AddInferencePipelineFormErrors;
  isLoading: boolean;
  isPipelineDataValid: boolean;
  index: FetchIndexApiResponse;
  mappingData: typeof MappingsApiLogic.values.data;
  mappingStatus: Status;
  mlInferencePipeline?: MlInferencePipeline;
  mlModelsData: typeof MLModelsApiLogic.values.data;
  mlModelsStatus: typeof MLModelsApiLogic.values.apiStatus;
  simulatePipelineData: typeof SimulateMlInterfacePipelineApiLogic.values.data;
  simulatePipelineErrors: string[];
  simulatePipelineResult: unknown; // TODO type
  simulatePipelineStatus: typeof SimulateMlInterfacePipelineApiLogic.values.status;
  sourceFields: string[] | undefined;
  supportedMLModels: typeof MLModelsApiLogic.values.data;
}

export const MLInferenceLogic = kea<
  MakeLogicType<MLInferenceProcessorsValues, MLInferenceProcessorsActions>
>({
  actions: {
    clearFormErrors: true,
    createPipeline: true,
    setAddInferencePipelineStep: (step: AddInferencePipelineSteps) => ({ step }),
    setCreateErrors: (errors: string[]) => ({ errors }),
    setFormErrors: (inputErrors: AddInferencePipelineFormErrors) => ({ inputErrors }),
    setIndexName: (indexName: string) => ({ indexName }),
    setInferencePipelineConfiguration: (configuration: InferencePipelineConfiguration) => ({
      configuration,
    }),
    setPipelineSimulateBody: (simulateBody: string) => ({
      simulateBody,
    }),
    setSimulatePipelineErrors: (errors: string[]) => ({ errors }),
    simulatePipeline: true,
  },
  connect: {
    actions: [
      MappingsApiLogic,
      ['makeRequest as makeMappingRequest', 'apiError as mappingsApiError'],
      MLModelsApiLogic,
      ['makeRequest as makeMLModelsRequest', 'apiError as mlModelsApiError'],
      SimulateMlInterfacePipelineApiLogic,
      [
        'makeRequest as makeSimulatePipelineRequest',
        'apiSuccess as simulatePipelineApiSuccess',
        'apiError as simulatePipelineApiError',
      ],
      CreateMlInferencePipelineApiLogic,
      [
        'apiError as createApiError',
        'apiSuccess as createApiSuccess',
        'makeRequest as makeCreatePipelineRequest',
      ],
    ],
    values: [
      FetchIndexApiLogic,
      ['data as index'],
      MappingsApiLogic,
      ['data as mappingData', 'status as mappingStatus'],
      MLModelsApiLogic,
      ['data as mlModelsData', 'status as mlModelsStatus'],
      SimulateMlInterfacePipelineApiLogic,
      ['data as simulatePipelineData', 'status as simulatePipelineStatus'],
    ],
  },
  events: {},
  listeners: ({ values, actions }) => ({
    createPipeline: () => {
      const {
        addInferencePipelineModal: { configuration, indexName },
      } = values;

      actions.makeCreatePipelineRequest({
        destinationField:
          configuration.destinationField.trim().length > 0
            ? configuration.destinationField
            : undefined,
        indexName,
        modelId: configuration.modelID,
        pipelineName: configuration.pipelineName,
        sourceField: configuration.sourceField,
      });
    },
    makeCreatePipelineRequest: () => actions.setCreateErrors([]),
    setIndexName: ({ indexName }) => {
      actions.makeMLModelsRequest(undefined);
      actions.makeMappingRequest({ indexName });
    },
    simulatePipeline: () => {
      if (values.mlInferencePipeline) {
        actions.setSimulatePipelineErrors([]);
        actions.makeSimulatePipelineRequest({
          docs: values.addInferencePipelineModal.simulateBody,
          indexName: values.addInferencePipelineModal.indexName,
          pipeline: values.mlInferencePipeline,
        });
      }
    },
  }),
  path: ['enterprise_search', 'content', 'pipelines_add_ml_inference_pipeline'],
  reducers: {
    addInferencePipelineModal: [
      {
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
      {
        setAddInferencePipelineStep: (modal, { step }) => ({ ...modal, step }),
        setIndexName: (modal, { indexName }) => ({ ...modal, indexName }),
        setInferencePipelineConfiguration: (modal, { configuration }) => ({
          ...modal,
          configuration,
        }),
        setPipelineSimulateBody: (modal, { simulateBody }) => ({
          ...modal,
          simulateBody,
        }),
      },
    ],
    createErrors: [
      [],
      {
        createApiError: (_, error) => getErrorsFromHttpResponse(error),
        setCreateErrors: (_, { errors }) => errors,
      },
    ],
    simulatePipelineErrors: [
      [],
      {
        setSimulatePipelineErrors: (_, { errors }) => errors,
        simulatePipelineApiError: (_, error) => getErrorsFromHttpResponse(error),
      },
    ],
  },
  selectors: ({ selectors }) => ({
    formErrors: [
      () => [selectors.addInferencePipelineModal],
      (modal: AddInferencePipelineModal) =>
        validateInferencePipelineConfiguration(modal.configuration),
    ],
    isLoading: [
      () => [selectors.mlModelsStatus, selectors.mappingStatus],
      (mlModelsStatus, mappingStatus) =>
        !API_REQUEST_COMPLETE_STATUSES.includes(mlModelsStatus) ||
        !API_REQUEST_COMPLETE_STATUSES.includes(mappingStatus),
    ],
    isPipelineDataValid: [
      () => [selectors.formErrors],
      (errors: AddInferencePipelineFormErrors) => Object.keys(errors).length === 0,
    ],
    mlInferencePipeline: [
      () => [
        selectors.isPipelineDataValid,
        selectors.addInferencePipelineModal,
        selectors.mlModelsData,
      ],
      (
        isPipelineDataValid: boolean,
        { configuration }: AddInferencePipelineModal,
        models: MLInferenceProcessorsValues['mlModelsData']
      ) => {
        if (!isPipelineDataValid) return undefined;
        const model = models?.find((mlModel) => mlModel.model_id === configuration.modelID);
        if (!model) return undefined;

        return generateMlInferencePipelineBody({
          destinationField:
            configuration.destinationField || formatPipelineName(configuration.pipelineName),
          model,
          pipelineName: configuration.pipelineName,
          sourceField: configuration.sourceField,
        });
      },
    ],
    simulatePipelineResult: [
      () => [selectors.simulatePipelineStatus, selectors.simulatePipelineData],
      (status: Status, simulateResult: unknown) => {
        // TODO type

        if (status !== Status.SUCCESS) return '';
        return simulateResult;
      },
    ],
    sourceFields: [
      () => [selectors.mappingStatus, selectors.mappingData, selectors.index],
      (
        status: Status,
        mapping: IndicesGetMappingIndexMappingRecord,
        index: FetchIndexApiResponse
      ) => {
        if (status !== Status.SUCCESS) return;
        if (mapping?.mappings?.properties === undefined) {
          if (isConnectorIndex(index)) {
            return DEFAULT_CONNECTOR_FIELDS;
          }
          return [];
        }
        return Object.entries(mapping.mappings.properties)
          .reduce((fields, [key, value]) => {
            if (value.type === 'text' || value.type === 'keyword') {
              fields.push(key);
            }
            return fields;
          }, [] as string[])
          .sort(sortSourceFields);
      },
    ],
    supportedMLModels: [
      () => [selectors.mlModelsData],
      (mlModelsData: TrainedModelConfigResponse[] | undefined) => {
        return mlModelsData?.filter(isSupportedMLModel);
      },
    ],
  }),
});
