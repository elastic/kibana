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

import { isConnectorIndex } from '../../../../utils/indices';
import { isSupportedMLModel, sortSourceFields } from '../../../shared/ml_inference/utils';

import { AddInferencePipelineFormErrors, InferencePipelineConfiguration } from './types';
import { validateInferencePipelineConfiguration } from './utils';

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
}

export interface AddInferencePipelineModal {
  configuration: InferencePipelineConfiguration;
  indexName: string;
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
  },
  connect: {
    actions: [
      MappingsApiLogic,
      ['makeRequest as makeMappingRequest', 'apiError as mappingsApiError'],
      MLModelsApiLogic,
      ['makeRequest as makeMLModelsRequest', 'apiError as mlModelsApiError'],
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
    ],
  },
  events: {},
  listeners: ({ values, actions }) => ({
    createPipeline: () => {
      const {
        addInferencePipelineModal: { configuration, indexName },
      } = values;

      actions.makeCreatePipelineRequest({
        indexName,
        pipelineName: configuration.pipelineName,
        modelId: configuration.modelID,
        sourceField: configuration.sourceField,
        destinationField:
          configuration.destinationField.trim().length > 0
            ? configuration.destinationField
            : undefined,
      });
    },
    makeCreatePipelineRequest: () => actions.setCreateErrors([]),
    setIndexName: ({ indexName }) => {
      actions.makeMLModelsRequest(undefined);
      actions.makeMappingRequest({ indexName });
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
        step: AddInferencePipelineSteps.Configuration,
      },
      {
        setAddInferencePipelineStep: (modal, { step }) => ({ ...modal, step }),
        setIndexName: (modal, { indexName }) => ({ ...modal, indexName }),
        setInferencePipelineConfiguration: (modal, { configuration }) => ({
          ...modal,
          configuration,
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
